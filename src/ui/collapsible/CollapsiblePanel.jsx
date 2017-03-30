import {UI} from "../UIBase";
import {CollapsibleMixin} from "./CollapsibleMixin";
import {CardPanel} from "../CardPanel";
import {CollapsiblePanelStyle} from "./Style";

class CollapsiblePanel extends CollapsibleMixin(CardPanel) {
    static styleSet = new CollapsiblePanelStyle();

    getStyleSet() {
        return this.options.styleSet || this.constructor.styleSet;
    }

    toggle() {
        if (this.options.collapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    expand() {
        super.expand(this.contentArea);
        this.toggleButton.removeClass(this.getStyleSet().collapsedButton);
    }

    collapse() {
        super.collapse(this.contentArea);
        setTimeout(() => {
            this.toggleButton.addClass(this.getStyleSet().collapsedButton);
        }, this.getCollapsibleStyleSet().transitionDuration * 700);
    }

    render() {
        let autoHeightClass = "";
        let collapsedPanelClass = "";
        let collapsedHeadingClass = "";
        let hiddenClass = "";
        let contentStyle = {};

        if (this.options.autoHeight) {
            autoHeightClass = "auto-height ";
        }
        if (this.options.collapsed) {
            collapsedHeadingClass = this.getStyleSet().collapsedButton;
            collapsedPanelClass = this.getCollapsibleStyleSet().collapsed;
            hiddenClass = "hidden";
        }
        if (!this.options.noPadding) {
            contentStyle = {
                padding: "8px 8px",
            };
        }

        return [<div className={this.getStyleSet().heading}>
                    <a ref="toggleButton"  className={`${this.getStyleSet().button} ${collapsedHeadingClass}`}
                        onClick={() => this.toggle()}>
                        {this.getTitle()}
                    </a>
                </div>,
                <div style={{overflow: "hidden"}}>
                  <div ref="contentArea" className={`${autoHeightClass} ${collapsedPanelClass} ${hiddenClass}`}
                       style={contentStyle}>
                        {this.getGivenChildren()}
                    </div>
                </div>
        ];
    }
}


class DelayedCollapsiblePanel extends CollapsiblePanel {
    toggle() {
        if (!this._haveExpanded) {
            this._haveExpanded = true;
            UI.renderingStack.push(this);
            this.contentArea.options.children = this.getGivenChildren();
            UI.renderingStack.pop();
            this.contentArea.redraw();
            this.delayedMount();
        }
        super.toggle();
    }

    getGivenChildren() {
        if (!this._haveExpanded) {
            return [];
        }
        return this.getDelayedChildren();
    }
}

export {CollapsiblePanel, DelayedCollapsiblePanel};