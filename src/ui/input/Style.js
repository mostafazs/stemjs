import {StyleSheet, styleRule} from "../Style";

class InputStyle extends StyleSheet {
    @styleRule
    inputElement = {
        transition: "border-color ease-in-out .15s, box-shadow ease-in-out .15s",
        padding: "0.4em 0.54em",
        backgroundColor: this.themeProps.INPUT_BACKGROUND_COLOR,
        border: () => "1px solid " + this.themeProps.INPUT_BORDER_COLOR,
        borderRadius: this.themeProps.INPUT_BORDER_RADIUS,
        ":focus": {
            outline: "0",
            borderColor: "#66afe9",
        },
    };

    @styleRule
    checkboxInput = {
        display: "inline-block",
    };

    @styleRule
    select = {
    };
}

export {InputStyle};
