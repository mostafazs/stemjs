import {TableStyle} from "./Style";
import {UI} from "../UIBase";
import {registerStyle} from "../style/Theme";

// TODO: the whole table architecture probably needs a rethinking
class TableRow extends UI.Primitive("tr") {
    render() {
        return this.options.columns.map((column, index) => this.renderEntryCell(column, index));
    }

    renderEntryCell(column, columnIndex) {
        // TODO support more complex style options and {...columns.extraOptions(entry)}
        return <td style={column.cellStyle} key={columnIndex}>{column.value(this.options.entry, this.options.index)}</td>;
    }
}

@registerStyle(TableStyle)
class Table extends UI.Primitive("table") {
    getDefaultOptions(options) {
        return {
            columns: [],
            entries: [],
            rowClass: TableRow,
        }
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.table); // TODO user container instead of table
    }

    getRowClass() {
        return this.options.rowClass;
    }

    makeRow(entry, index) {
        if (entry instanceof UI.Element && (entry.getNodeType() === "tr" || entry.getNodeType() === "tbody")) {
            return entry;
        }
        const RowClass = this.getRowClass(entry, index);
        return <RowClass {...this.getRowOptions(entry, index)} />
    }

    getRowOptions(entry, index) {
        const {columns} = this.options;
        return {
            entry,
            columns,
            index,
            parent: this,
            key: this.getEntryKey(entry, index),
        };
    }

    render() {
        return [
            this.renderTableHead(),
            this.renderTableBody(),
        ];
    }

    renderTableHead() {
        const {noHeader} = this.options;
        return !noHeader && <thead>
            <tr>{this.options.columns.map(this.renderHeaderCell, this)}</tr>
        </thead>;
    }

    getEntryKey(entry, index) {
        return (entry && entry.id != null) ? entry.id : index;
    }

    renderRows() {
        const entries = this.getEntries();
        return this.rows = entries.map((entry, index) => this.makeRow(entry, index));
    }

    renderTableBody() {
        return <tbody>{this.renderRows()}</tbody>;
    }

    // Renders the whole header cell based on a column
    renderHeaderCell(column, index) {
        return <th style={column.headerStyle} ref={"columnHeader" + index}>
                {this.renderColumnHeader(column)}
            </th>;
    }

    // Only renders the content of the header cell
    renderColumnHeader(column) {
        if (typeof column.headerName === "function") {
            return column.headerName();
        }
        return column.headerName;
    }

    getEntries() {
        return this.options.entries || [];
    }

    setEntries(entries) {
        this.updateOptions({entries});
    }

    setColumns(columns) {
        this.options.columns = columns;
    }
}

export * from "./Style";
export {Table, TableRow};
