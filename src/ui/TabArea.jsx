// TODO: all of the classes here need to be implemented with StyleSets
import {UI} from "./UIBase";
import {SingleActiveElementDispatcher} from "../base/Dispatcher";
import {css, hover, focus, active, ExclusiveClassSet, StyleSet} from "Style";
import "./Switcher";

class TabAreaStyle extends StyleSet {
    constructor() {
        super();

        this.activeTab = this.css({
            "color": "#555 !important",
            "cursor": "default !important",
            "background-color": "#fff !important",
            "border": "1px solid #ddd !important",
            "border-bottom-color": "transparent !important",
        });

        this.tab = this.css({
            "user-select": "none",
            "margin-bottom": "-1px",
            "text-decoration": "none !important",
            "float": "left",
            "margin-right": "2px",
            "line-height": "1.42857143",
            "border": "1px solid transparent",
            "border-radius": "4px 4px 0 0",
            "position": "relative",
            "display": "block",
            "padding": "8px",
            "padding-left": "10px",
            "padding-right": "10px",
            ":hover": {
                "cursor": "pointer",
                "background-color": "#eee",
                "color": "#555",
                "border": "1px solid #ddd",
                "border-bottom-color": "transparent",
            },
        });

        this.nav = this.css({
            "border-bottom": "1px solid #ddd",
            "padding-left": "0",
            "margin-bottom": "0",
            "list-style": "none",
        });
    }
}

let tabAreaStyle = new TabAreaStyle();

class BasicTabTitle extends UI.Element {
    getPrimitiveTag() {
        return "span";
    }

    canOverwrite(existingElement) {
        // Disable reusing with different panels, since we want to attach listeners to the panel
        // TODO: might want to just return the key as this.options.panel
        return super.canOverwrite(existingElement) &&
                this.options.panel === existingElement.options.panel;
    }

    setActive(active) {
        this.options.active = active;
        this.redraw();
        if (active) {
            this.options.activeTabDispatcher.setActive(this.options.panel, () => {
                this.setActive(false);
            });
        }
    }

    getTitle() {
        return this.options.title || this.options.panel.getTitle();
    }

    renderHTML() {
        let hrefOption = {};
        if (this.options.href) {
            hrefOption.href = this.options.href;
        }
        let activeTab = "";
        if (this.options.active) {
            activeTab = tabAreaStyle.activeTab;
        }
        return [
            <a {...hrefOption}  className={`${activeTab} ${tabAreaStyle.tab}`}>
                {this.getTitle()}
            </a>
        ];
    }

    onMount() {
        if (this.options.active) {
            this.setActive(true);
        }

        this.addClickListener(() => {
            this.setActive(true);
        });

        // TODO: less assumptions here
        if (this.options.panel && this.options.panel.addListener) {
            this.attachListener(this.options.panel, "show", () => {
                this.setActive(true);
            });
        }
    }
};

UI.TabTitleArea = class TabTitleArea extends UI.Element {
    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        attr.addClass(tabAreaStyle.nav);
        return attr;
    }
};

// Inactive class for the moment, should extend BasicTabTitle
class SVGTabTitle extends UI.Element  {
    setOptions(options) {
        super.setOptions(options);
        this.options.angle = options.angle || "0";
        this.options.strokeWidth = options.strokeWidth || "2";
    };

    getPrimitiveTag() {
        return "li";
    };

    setLabel(label) {
        this.options.label = label;
        this.redraw();
    };

    redraw() {
        super.redraw();
        setTimeout(() => {
            let strokeWidth = parseFloat(this.options.strokeWidth);
            let mainHeight = 1.4 * this.tabTitle.getHeight();
            let angleWidth = Math.tan(this.options.angle / 180 * Math.PI) * mainHeight;
            let mainWidth = this.tabTitle.getWidth() + 1.2 * this.tabTitle.getHeight();
            let tabHeight = mainHeight;
            let tabWidth = mainWidth + 2 * angleWidth;

            let svgWidth = tabWidth + 2 * strokeWidth;
            let svgHeight = tabHeight + strokeWidth;

            let pathString = "M " + strokeWidth + " " + (svgHeight + strokeWidth / 2) + " l " + angleWidth + " -" +
                        svgHeight + " l " + mainWidth + " 0 l " + angleWidth + " " + svgHeight;

            this.tabSvg.setWidth(svgWidth);
            this.tabSvg.setHeight(svgHeight);
            //TODO Check if this is working. It might not.
            this.tabPath.setPath(pathString);
            this.tabTitle.setStyle("top",tabHeight / 6 + strokeWidth);
            this.tabTitle.setStyle("left", angleWidth + strokeWidth + 0.6 * this.tabTitle.getHeight() + "px");
            console.log(angleWidth);
            this.setStyle("margin-right", -(angleWidth + 2 * strokeWidth));
            this.setStyle("z-index", 100);
        }, 0);
    }

    renderHTML() {
        return [
            <UI.SVG.SVGRoot ref="tabSvg" style={{width: "0px", height: "0px"}}>
                <UI.SVG.Path ref="tabPath" d=""/>
            </UI.SVG.SVGRoot>,
            //TODO Rename this to labelPanel
            <UI.Panel ref="tabTitle" style={{pointerEvents: "none", position: "absolute"}}>
                {this.options.label}
            </UI.Panel>];
    };
}

UI.TabArea = class TabArea extends UI.Element {
    constructor(options) {
        super(options);
        this.activeTabDispatcher = new SingleActiveElementDispatcher();
    }

    setOptions(options) {
        options = Object.assign({
            autoActive: true,
        }, options);
        super.setOptions(options);
    }

    getDOMAttributes() {
        let attr = super.getDOMAttributes();
        if (!this.options.variableHeightPanels) {
            attr.addClass("auto-height-parent");
        }
        return attr;
    }

    createTabPanel(panel) {
        let tab = <BasicTabTitle panel={panel} activeTabDispatcher={this.activeTabDispatcher} active={panel.options.active} href={panel.options.tabHref} />;

        //TODO: Don't modify the panel element!!!!
        let panelClass = " tab-panel nopad";
        if (!this.options.variableHeightPanels) {
            panelClass += " auto-height-child";
        }
        panel.options.className = (panel.options.className || "") + panelClass;

        return [tab, panel];
    }

    appendChild(panel, doMount) {
        let [tabTitle, tabPanel] = this.createTabPanel(panel);

        this.options.children.push(panel);

        this.titleArea.appendChild(tabTitle);
        this.switcherArea.appendChild(tabPanel, doMount || true);
    };

    getTitleArea(tabTitles) {
        return <UI.TabTitleArea ref="titleArea">
            {tabTitles}
        </UI.TabTitleArea>;
    }

    getSwitcher(tabPanels) {
        let switcherClass = "";
        if (!this.options.variableHeightPanels) {
            switcherClass = "auto-height";
        }
        return <UI.Switcher ref="switcherArea" className={switcherClass} lazyRender={this.options.lazyRender}>
                {tabPanels}
            </UI.Switcher>;
    }

    renderHTML() {
        let tabTitles = []
        let tabPanels = [];
        let activeTab;

        for (let panel of this.options.children) {
            let [tabTitle, tabPanel] = this.createTabPanel(panel);

            if (tabTitle.options.active) {
                activeTab = tabTitle;
            }

            tabTitles.push(tabTitle);
            tabPanels.push(tabPanel);
        }

        if (this.options.autoActive && !activeTab && tabTitles.length > 0) {
            tabTitles[0].options.active = true;
        }

        return [
            this.getTitleArea(tabTitles),
            <div style={{clear: "both"}}></div>,
            this.getSwitcher(tabPanels),
        ];
    };

    setActive(panel) {
        this.activeTabDispatcher.setActive(panel);
    }

    getActive() {
        return this.activeTabDispatcher.getActive();
    }

    onSetActive(panel) {
        this.switcherArea.setActive(panel);
    }

    onMount() {
        this.attachListener(this.activeTabDispatcher, (panel) => {
            this.onSetActive(panel);
        });

        this.addListener("resize", () => {
            this.switcherArea.dispatch("resize");
        });
    }
};

export {BasicTabTitle};
