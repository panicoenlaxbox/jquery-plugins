(function ($) {
	'use strict';

	function RowSpanChange(cell, rowSpan) {
		this.cell = cell;
		this.rowIndex = cell.parentNode.rowIndex;
		this.cellIndex = cell.cellIndex;
		this.value = cell.textContent;
		this.rowSpan = rowSpan;
	}

	RowSpanChange.createFrom = function (change) {
		return new RowSpanChange(change.cell, change.rowSpan);
	}

	function parseRowSpan(table, options) {
		var configuration = $.extend({
			fromIndex: 0
		}, options);
		var rows = Array.prototype.slice.call(table.getElementsByTagName('tbody')[0].rows, configuration.fromIndex);
		var rowsCount = rows.length;
		var cellsCount = rows[0].cells.length;
		var row = null;
		var cell = null;
		var previous = null;
		var currentValue = null;
		var changes = [];
		for (var cellIndex = 0; cellIndex < cellsCount; cellIndex++) {
			for (var rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
				row = rows[rowIndex];
				cell = row.cells[cellIndex];
				if (rowIndex === 0) {
					previous = new RowSpanChange(cell, 1);
				} else {
					currentValue = cell.textContent;
					if (previous.value === currentValue) {
						previous.rowSpan++;
					} else {
						if (previous.rowSpan > 1) {
							changes.push(RowSpanChange.createFrom(previous));
						}
						previous = new RowSpanChange(cell, 1);
					}
				}
			}
		}

		var i;
		var change = null;
		var ROWSPAN_ATTR = 'data-rowspan';
		var REMOVE_ATTR = 'data-remove';
		for (i = 0; i < changes.length; i++) {
			change = changes[i];
			change.cell.setAttribute(ROWSPAN_ATTR, change.rowSpan);
		}

		for (i = 0; i < changes.length; i++) {
			change = changes[i];
			for (var j = 1; j < change.rowSpan; j++) {
				cell = table.rows[change.rowIndex + j].cells[change.cellIndex];
				cell.setAttribute(REMOVE_ATTR, '');
			}
		}

		var cells = table.querySelectorAll('[' + ROWSPAN_ATTR + ']');
		for (i = 0; i < cells.length; i++) {
			cell = cells[i];
			cell.rowSpan = parseInt(cell.getAttribute(ROWSPAN_ATTR), 10);
			cell.removeAttribute(ROWSPAN_ATTR);
		}

		cells = table.querySelectorAll('[' + REMOVE_ATTR + ']');
		for (i = 0; i < cells.length; i++) {
			cells[i].remove();
		}
	}

	$.fn.parseRowSpan = function (options) {
		return this.each(function () {
			parseRowSpan(this, options);
		});
	};

})(jQuery);