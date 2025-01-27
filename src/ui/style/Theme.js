import {Dispatchable} from "../../base/Dispatcher";
import {UI} from "../UIBase";
import {StyleSheet} from "../Style";
import {CallThrottler} from "../../base/Utils";

function getInstance(styleSheet) {
    if (typeof styleSheet === "function") {
        if (typeof styleSheet.getInstance === "function") {
            styleSheet = styleSheet.getInstance();
        } else {
            styleSheet = styleSheet();
        }
    }
    return styleSheet;
}

function getInstanceForObject(obj) {
    if (!obj) {
        return null;
    }
    let styleSheet = (obj.theme && obj.theme.get(obj)) || obj.styleSheet;
    return getInstance(styleSheet);
}

class Theme extends Dispatchable {
    static PropsSymbol = Symbol("Props");

    classSet = new Set();
    styleSheetSet = new Set();
    properties = {theme: this};
    updateThrottler = new CallThrottler({throttle: 50});
    updateThrottled = this.updateThrottler.wrap(() => this.updateStyleSheets());

    constructor(name="") {
        super();
        this.styleSheetSymbol = Symbol("Theme" + name);

        window.addEventListener("resize", this.updateThrottled);
    }

    register(cls, styleSheet) {
        cls.theme = this;
        cls.styleSheet = styleSheet;
        this.set(cls, styleSheet);
    }

    set(cls, styleSheet) {
        cls[this.styleSheetSymbol] = styleSheet;
        this.classSet.add(cls);
    }

    get(cls) {
        if (!(typeof cls === "function")) {
            cls = cls.constructor;
        }
        return cls[this.styleSheetSymbol];
    }

    getProperties() {
        return this.properties;
    }

    getProperty(key, defaultValue) {
        const value = this.properties[key] || defaultValue;
        return (typeof value === "function") ? value() : value;
    }

    setProperties(properties, update=true) {
        Object.assign(this.properties, properties);
        if (update) {
            this.updateThrottled();
        }
    }

    setProperty(key, value) {
        this.properties[key] = value;
    }

    getAllStyleSheets() {
        let styleSheetSet = new Set(this.styleSheetSet);
        for (const cls of this.classSet.values()) {
            styleSheetSet.add(this.get(cls));
        }
        return Array.from(styleSheetSet).map(styleSheet => {
            if (styleSheet.getInstance) {
                return styleSheet.getInstance();
            }
            return styleSheet;
        });
    }

    addStyleSheet(styleSheet) {
        this.styleSheetSet.add(styleSheet);
    }

    removeStyleSheet(styleSheet) {
        this.styleSheetSet.delete(styleSheet);
    }

    updateStyleSheets() {
        this.dispatch("beforeUpdateStyleSheets");
        for (const styleSheet of this.getAllStyleSheets()) {
            if (styleSheet.update) {
                styleSheet.update();
            }
        }
        this.dispatch("afterUpdateStyleSheets");
    }

    static register(cls, styleSheet) {
        return this.Global.register(...arguments);
    }

    static get(cls) {
        return this.Global.get(...arguments);
    }

    static addStyleSheet(styleSheet) {
        this.Global.addStyleSheet(styleSheet);
    }

    static setProperties(properties) {
        this.Global.setProperties(...arguments);
    }

    static getProperties() {
        return this.Global.getProperties();
    }

    get props() {
        let props = this[this.constructor.PropsSymbol];
        if (!props) {
            props = this[this.constructor.PropsSymbol] = new Proxy(this.properties, {
                get: (properties, key, receiver) => {
                    let value = properties[key];
                    if (typeof value === "function") {
                        value = value(props);
                    }
                    return value;
                },
                set: (properties, key, value) => {
                    this.setProperty(key, value);
                    this.updateThrottled();
                    return value;
                }
            });
        }
        return props;
    }

    static get props() {
        return this.Global.props;
    }
}

Theme.Global = new Theme("Global");

UI.Element.prototype.getStyleSheet = function styleSheetGetter() {
    return getInstanceForObject(this.options) || getInstanceForObject(this.constructor);
};

function registerStyle(styleClass, theme=Theme.Global) {
    return (target) => {
        theme.register(target, styleClass);
    }
}

StyleSheet.theme = Theme.Global;

export {Theme, registerStyle};
