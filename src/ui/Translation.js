import {UI} from "./UIBase";
import {isString} from "../base/Utils";

// This is the object that will be used to translate text
let translationMap = null;

// Keep a set of all UI Element that need to be updated when the language changes
// Can't use a weak set here unfortunately because we need iteration
// That's why we must make sure to remove all nodes from the set when destroying them
UI.TranslationElements = new Set();

if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(pattern, replacement) {
        if (isString(pattern)) {
            pattern = new RegExp(pattern, "g");
        }
        if (this?.replace) {
            return this.replace(pattern, replacement);
        }
        return this;
    };
}

UI.TranslationTextElement = class TranslationTextElement extends UI.TextElement {
    constructor(value) {
        if (arguments.length === 1) {
            super(value);
        } else {
            super("");
            this.setValue(...arguments);
        }
    }

    setValue(value) {
        if (arguments.length > 1) {
            this.value = Array.from(arguments);
        } else {
            this.value = value;
        }
        if (this.node) {
            this.redraw();
        }
    }

    // args[0] is a string where the "%[number]" block will be replaced by the args[number]
    evaluateSprintf(...args) {
        let str = translationMap && translationMap.get(args[0]);
        if (!str) {
            return "";
        }

        for (let index = 1; index < args.length; index += 1) {
            str = str.replaceAll("%" + index, args[index]);
        }

        return str;
    }

    evaluate(strings, ...values) {
        if (!Array.isArray(strings)) {
            return this.evaluateSprintf(...arguments);
            // This means strings is a string with the sprintf pattern
        } else {
            // Using template literals https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals
            if (arguments.length !== strings.length) {
                console.error("Invalid arguments to evaluate ", Array.from(arguments));
            }
            let result = strings[0];
            for (let i = 1; i < arguments.length; i++) {
                result += arguments[i];
                result += strings[i];
            }
            return result;
        }
    }

    getValue() {
        let value = this.value;
        if (Array.isArray(this.value)) {
            value = this.evaluate(...value);
        } else {
            value = (translationMap && translationMap.get(value)) ?? value;
        }
        return value;
    }

    toString() {
        return this.getValue();
    }

    redraw() {
        if (!this.node) {
            this.node = this.createNode();
        }
        super.redraw();
    }

    onMount() {
        UI.TranslationElements.add(this);
    }

    onUnmount() {
        UI.TranslationElements.delete(this);
    }
};

// This method is a shorthand notation to create a new translatable text element
// TODO: should also support being used as a string template
UI.T = (str) => {
    return new UI.TranslationTextElement(str);
};

// TODO @mciucu this should be wrapped in a way that previous requests that arrive later don't get processed
// TODO: should this be done with promises?
// Function to be called with a translation map
// The translationMap object needs to implement .get(value) to return the translation for value
function setTranslationMap(_translationMap) {
    if (translationMap === _translationMap) {
        return;
    }
    translationMap = _translationMap;
    for (let textElement of UI.TranslationElements.values()) {
        textElement.redraw();
    }
}

let languageStore = null;

// This function should be called to set the language store to watch for changes
// The languageStore argumenent needs to implement .getLocale(), addListener("localChange", (language) =>{})
// The language objects need to implement .buildTranslation(callback), where callback should be called with a translationMap
function setLanguageStore(_languageStore) {
    languageStore = _languageStore;

    let currentLocale = languageStore.getLocale();
    // If there's a default language already set, build the translation table for it
    if (currentLocale) {
        currentLocale.buildTranslation(setTranslationMap);
    }

    // Add a listener for whenever the language changes
    languageStore.addListener("localeChange", (language) => {
        language.buildTranslation(setTranslationMap);
    });
}

function getTranslationMap() {
    return translationMap;
}

export {setLanguageStore, setTranslationMap, getTranslationMap};
