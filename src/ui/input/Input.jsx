import {UI} from "../UIBase";
import {DOMAttributesMap} from "../NodeAttributes";
import {InputStyle} from "./Style";
import {registerStyle} from "../style/Theme";
import {StemDate} from "../../time/Date";


// TODO rename to BaseInputElement
// TODO handle the setOptions - initialValue lifecycle
@registerStyle(InputStyle)
export class InputableElement extends UI.Element {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(this.styleSheet.inputElement);
    }

    isEqual(valueA, valueB) {
        return valueA === valueB;
    }

    setOptions(options) {
        const oldInitialValue = this.options.initialValue;
        super.setOptions(options);
        const {initialValue} = this.options;
        if (oldInitialValue == null && initialValue == null) {
            return;
        }
        // TODO @branch reimplement to be like Denis's code
        if (this.node && !this.isEqual(initialValue, oldInitialValue)) {
            this.setValue(initialValue);
        }
    }

    focus() {
        this.node.focus();
    }

    blur() {
        this.node.blur();
    }

    onMount() {
        const {initialValue} = this.options;
        if (initialValue) {
            this.setValue(initialValue);
        }
    }

    addChangeListener(callback) {
        return this.addNodeListener("change", callback);
    }

    addInputListener(callback) {
        return this.addNodeListener("input", callback);
    }
}


class Input extends UI.Primitive(InputableElement, "input") {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.setAttribute("type", this.getInputType() || this.options.type);
    }

    getValue() {
        return this.node.value;
    }

    setValue(newValue) {
        if (newValue != null) {
            this.node.value = newValue;
        } else {
            this.node.removeAttribute("value");
        }
    }

    setOptions(options) {
        const oldInitialValue = this.options.initialValue;
        const oldValue = this.options.value;
        super.setOptions(options);
        if (!this.node) {
            return;
        }
        const {initialValue, value} = this.options;
        if (initialValue && initialValue !== oldInitialValue) {
            this.setValue(initialValue);
        }
        if (value && value !== oldValue) {
            this.setValue(value);
        }
    }

    getInputType() {
        // Must be overloaded
        return null;
    }

    addKeyUpListener(callback) {
        this.addNodeListener("keyup", callback);
    }

    onMount() {
        // TODO Fix value and initialValue logic
        this.setValue(this.options.value || this.options.initialValue);
    }
}

Input.domAttributesMap = new DOMAttributesMap(UI.Element.domAttributesMap, [
    ["autocomplete"],
    ["autofocus", {noValue: true}],
    ["formaction"],
    ["maxLength", {domName: "maxlength"}],
    ["minLength", {domName: "minlength"}],
    ["name"],
    ["placeholder"],
    ["readonly"],
    ["required"],
    ["value"],
    ["pattern"],
    ["type"],
]);


class SubmitInput extends Input {
    getInputType() {
        return "submit";
    }
}
SubmitInput.domAttributesMap = new DOMAttributesMap(UI.Element.domAttributesMap, [
    ["formenctype"],
    ["formmethod"],
    ["formnovalidate"],
    ["formtarget"]
]);


class TextInput extends Input {
    getInputType() {
        return "text";
    }
}

class NumberInput extends Input {
    getInputType() {
        return "number";
    }

    getValue() {
        const value = super.getValue();
        return value ? parseFloat(value) : null;
    }
}

NumberInput.domAttributesMap = new DOMAttributesMap(UI.Element.domAttributesMap, [
    ["min"],
    ["max"],
    ["step"],
]);


class TelInput extends Input {
    getInputType() {
        return "tel";
    }
}

export class TimeInput extends Input {
    getInputType() {
        return "time";
    }

    setValue(value) {
        if (value instanceof Date) {
            value = StemDate.format(value, "HH:mm");
        }
        super.setValue(value);
    }

    // Returns a Date with that hour
    getValue(baseDate=new StemDate()) {
        let newDate = new StemDate(baseDate);
        newDate.setHours(0, 0, 0, this.node.valueAsNumber);
        return newDate;
    }
}


class EmailInput extends Input {
    getInputType() {
        return "email";
    }
}


class PasswordInput extends Input {
    getInputType() {
        return "password";
    }
}


class FileInput extends Input {
    getInputType() {
        return "file";
    }

    getFiles() {
        return this.node.files;
    }

    getFile() {
        // TODO: this is valid only if multipleFiles is false
        return this.getFiles()[0];
    }

    getAsFormData() {
        let formData = new FormData();
        for (let file of this.getFiles()) {
            formData.append(file.name, file);
        }
        return formData;
    }
}

FileInput.domAttributesMap = new DOMAttributesMap(UI.Element.domAttributesMap, [
    ["multipleFiles", {domName: "multiple", noValue: true}],
    ["fileTypes", {domName: "accept"}],
]);


class CheckboxInput extends Input {
    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(this.styleSheet.checkboxInput);
    }

    getInputType() {
        return "checkbox";
    }

    getValue() {
        return this.node.checked;
    }

    setValue(newValue, indeterminate) {
        this.node.checked = newValue;
        if (indeterminate != null) {
            this.setIndeterminate(indeterminate);
        }
    }

    setIndeterminate(value) {
        this.options.indeterminate = value;
        this.node && (this.node.indeterminate = value);
    }

    getIndeterminate() {
        return this.options.indeterminate;
    }

    // TODO @branch fix this
    render() {
        super.render();
        if (this.options.value != this.getValue() || this.getIndeterminate() != this.node?.indeterminate) {
            this.setValue(this.options.value, this.options.indeterminate);
        }
    }
}

CheckboxInput.domAttributesMap = new DOMAttributesMap(UI.Element.domAttributesMap, [
    ["checked", {noValue: true}]
]);


class RadioInput extends CheckboxInput {
    getInputType() {
        return "radio";
    }

    getValue() {
        return this.node.checked;
    }

    setValue(newValue) {
        this.node.checked = newValue;
    }
}

RadioInput.domAttributesMap = new DOMAttributesMap(CheckboxInput.domAttributesMap, [
    ["name"]
]);


class TextArea extends UI.Primitive(InputableElement, "textarea") {
    applyNodeAttributes() {
        super.applyNodeAttributes();
        this.node.readOnly = this.options.readOnly || false;
    }

    setReadOnly(value) {
        this.options.readOnly = value;
        this.node.readOnly = value;
    }

    getValue() {
        return this.node.value;
    }

    redraw() {
        super.redraw();
        if (this.options.hasOwnProperty("value")) {
            this.node.value = this.options.value + "";
        }
    }

    setValue(value) {
        this.options.value = value;
        this.node.value = value;
    }

    addKeyUpListener(callback) {
        this.addNodeListener("keyup", callback);
    }
}


// TODO this element is inconsistent with the rest. Properly fix the initialValue pattern
class Select extends UI.Primitive(InputableElement, "select") {
    render() {
        this.givenOptions = this.options.options || [];
        let selectOptions = [];

        for (let i = 0; i < this.givenOptions.length; i += 1) {
            let options = {
                key: i
            };
            if (this.givenOptions[i] == this.options.selected) {
                options.selected = true;
            }
            selectOptions.push(<option {...options}>{this.serializeEntry(this.givenOptions[i])}</option>);
        }

        return selectOptions;
    }

    serializeEntry(obj) {
        const {serializer} = this.options;
        if (serializer) {
            return serializer(obj);
        } else {
            return obj.toString();
        }
    }

    extraNodeAttributes(attr) {
        super.extraNodeAttributes(attr);
        attr.addClass(this.styleSheet.select);
    }

    get() {
        let selectedIndex = this.getIndex();
        return this.givenOptions[selectedIndex];
    }

    getValue() {
        return this.get();
    }

    set(value) {
        for (let i = 0; i < this.givenOptions.length; i++) {
            if (this.givenOptions[i] === value) {
                this.setIndex(i);
                return;
            }
        }
        console.error("Can't set the select option ", value, "\nAvailable options: ", this.givenOptions);
    }

    setValue(value) {
        this.set(value);
    }

    getIndex() {
        return this.node.selectedIndex;
    }

    setIndex(index) {
        this.node.selectedIndex = index;
        this.options.selected = this.givenOptions[index];
    }

    redraw() {
        super.redraw();
        if (this.options.selected) {
            this.set(this.options.selected);
        }
    }
}

export {InputStyle, Input, SubmitInput, TextInput, NumberInput, TelInput, EmailInput, PasswordInput, FileInput,
        CheckboxInput, RadioInput, TextArea, Select};
