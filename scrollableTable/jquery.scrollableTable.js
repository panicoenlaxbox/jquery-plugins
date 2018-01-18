(function ($) {
	'use strict';

	function createArray(length) {
		var arr = new Array(length || 0);
		var i;
		for (i = 0; i < arr.length; i++) {
			arr[i] = null;
		}
		i = length;
		if (arguments.length > 1) {
			var args = Array.prototype.slice.call(arguments, 1);
			while (i--) {
				arr[length - 1 - i] = createArray.apply(this, args);
			}
		}
		return arr;
	}

	function getFixedColsByRow(rows, fixedCols) {
		var matrix = createArray(rows.length, fixedCols);
		var indexes = createArray(rows.length);
		for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
			var row = rows[rowIndex];
			var row = rows[rowIndex];
			var cellCount = 0;
			for (var cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
				var cell = row.cells[cellIndex];
				var index = matrix[rowIndex].indexOf(null);
				if (index == -1) {
					break;
				}
				indexes[rowIndex] = cellCount++;
				for (var i = index; i < index + cell.colSpan; i++) {
					matrix[rowIndex][i] = 'Y';
					for (var j = 1; j < cell.rowSpan; j++) {
						matrix[rowIndex + j][i] = 'N';
					}
				}
			}
		}
		return indexes;
	}


	function appendRowsKeepingFixedCols($table, $trs, fixedCols) {
		var $tbody = $table.find('> tbody:eq(0)');
		var fixedCols = getFixedColsByRow($trs.toArray(), fixedCols);
		$.each($trs, function (index, element) {
			var $tr = $(element).clone();
			$tr.find('> td:gt(' + fixedCols[index] + ')').remove();
			$tbody.append($tr);
		});
	}

	function setHeight(data) {
		//set height of fixed_rc and fixed_c
		for (var i = 0; i < this.rows.length; i++) {
			var ch = $(this.rows[i]).outerHeight();
			var fch = $(data.$ft_c[0].rows[i]).outerHeight(true);

			ch = (ch > fch) ? ch : fch;

			if (i < data.$ft_rc[0].rows.length) {
				$(data.$ft_r[0].rows[i])
					.add(data.$ft_rc[0].rows[i])
					.height(ch);
			}

			$(data.$ft_c[0].rows[i])
				.add(this.rows[i])
				.height(ch);
		}
	}

	function getWidthAccordingColgroup($table, fixedCols) {
		var selector = '> colgroup > col';
		if (fixedCols) {
			selector += ':lt(' + fixedCols + ')';
		}
		return $table.find(selector).toArray().reduce(
			function (accumulator, currentValue, currentIndex, array) {
				return accumulator + parseInt($(currentValue).prop('width'), 10);
			}, 0);
	}

	var methods = {
		init: function (options) {
			return this.each(function () {
				var $this = $(this);
				if (!$this.data('scrollableTable')) {

					var configuration = {
						height: 0,
						width: 0,
						fixedCols: 0,
						tableFactory: function () {
							return '<table />';
						}
					};

					$.extend(true, configuration, options);

					var data = {
						$ft_container: null,
						$ft_rel_container: null,
						$ft_scroller: null,
						$ft_rc: null,
						$ft_r: null,
						$ft_c: null,
						fixedCols: configuration.fixedCols,
						tableWidth: 0
					};

					data.tableWidth = $this.width();

					var widthAccordingColgroup = getWidthAccordingColgroup($this);
					if (configuration.width > widthAccordingColgroup) {
						configuration.width = widthAccordingColgroup + 17;
					}

					$this.wrap('<div class="ft_container" />');
					data.$ft_container = $this.parent().css({						
						height: configuration.height
					});

					$this.width(data.tableWidth);

					$this.wrap('<div class="ft_rel_container" />');
					data.$ft_rel_container = $this.parent();

					$this.wrap('<div class="ft_scroller" />');
					data.$ft_scroller = $this.parent().css('width', configuration.width);

					var $thead = $this.find('> thead');
					var $theadClone = $thead.clone();
					var $colgroupClone = $this.find('> colgroup').clone();
					data.$ft_rel_container
						.prepend($(configuration.tableFactory(), {
								'class': 'ft_r'
							})
							.append($colgroupClone)
							.append($theadClone));

					data.$ft_r = $('.ft_r', data.$ft_rel_container);
					data.$ft_r.wrap($('<div />', {
						'class': 'ft_rwrapper'
					}));

					data.$ft_r.width(data.tableWidth);

					if (configuration.fixedCols > 0) {
						//clone the thead again to construct the 
						$theadClone = $thead.clone();

						var fixedCols = getFixedColsByRow($this.find('> thead > tr').toArray(), configuration.fixedCols);
						for (var i = 0; i < fixedCols.length; i++) {
							$('> tr:eq(' + i + ') > th:gt(' + fixedCols[i] + ')', $theadClone).remove();
						}

						//add fixed row col section
						$colgroupClone = $this.find('> colgroup').clone();
						$colgroupClone.find('> col:gt(' + (configuration.fixedCols - 1) + ')').remove();
						data.$ft_rel_container
							.prepend($(configuration.tableFactory(), {
									'class': 'ft_rc'
								})
								.append($colgroupClone)
								.append($theadClone));

						//an instance of fixed row column
						data.$ft_rc = $('.ft_rc', data.$ft_rel_container);

						//now clone the fixed row column and append tbody for the remaining rows
						data.$ft_c = data.$ft_rc.clone();
						data.$ft_c[0].className = 'ft_c';

						//append tbody
						data.$ft_c.append('<tbody />');

						appendRowsKeepingFixedCols(data.$ft_c, $this.find('> tbody:eq(0) > tr'), configuration.fixedCols);

						data.$ft_rc.after(data.$ft_c);
						data.$ft_c.wrap($('<div />', {
							'class': 'ft_cwrapper'
						}));

						var fixedColsWidth = getWidthAccordingColgroup($this, configuration.fixedCols);
						data.$ft_c.add(data.$ft_rc).width(fixedColsWidth);
						data.$ft_c.height($this.outerHeight(true));

						setHeight.call(this, data);

						var $ft_cwrapper = data.$ft_c.parent();
						$ft_cwrapper.css({
							height: data.$ft_container.height() - 17
						}).width(data.$ft_rc.outerWidth(true) + 1);
					}

					var $ft_rwrapper = data.$ft_r.parent();
					$ft_rwrapper.css({
						width: data.$ft_scroller.width()
					});

					data.$ft_scroller.on('scroll.scrollableTable', function () {
						// console.log('scroll.scrollableTable');
						if (configuration.fixedCols > 0) {
							data.$ft_c.css('top', ($(this).scrollTop() * -1));
						}
						data.$ft_r.css('left', ($(this).scrollLeft() * -1));
					});

					$this.data('scrollableTable', data);
				}
			});
		},
		appendRows: function ($rows) {
			return this.each(function () {
				var $this = $(this);
				var data = $this.data('scrollableTable');
				if (data) {
					$this.children('tbody:eq(0)').append($rows);
					appendRowsKeepingFixedCols(data.$ft_c, $rows, data.fixedCols);
					setHeight.call(this, data);
				}
			});
		},
		destroy: function () {
			return this.each(function () {
				var $this = $(this);
				var data = $this.data('scrollableTable');
				if (data) {
					$this.insertBefore(data.$ft_container);
					data.$ft_container.remove();
					$this.css('width', '');
					$('tr', $this).css('height', '');
					$this.removeData('scrollableTable');
					$this.off('.scrollableTable');
				}
			});
		}
	};


	$.fn.scrollableTable = function (method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on jQuery.scrollableTable');
		}
	};

})(jQuery);