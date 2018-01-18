(function ($) {
	'use strict';

	var methods = {
		init: function (options) {			
			return this.each(function () {
				var $this = $(this);
				if (!$this.data('endlessScrolling')) {

					var configuration = {};

					var data = $.extend(true, {}, configuration, options);

					$this.on('scroll.endlessScrolling', function (e) {
						console.log('scroll.endlessScrolling');
						if (this.scrollHeight - this.scrollTop === this.clientHeight) {
							if (data.load() === false) {
								destroy.call($this);
							}
						}
					});

					$this.data('endlessScrolling', data);
				}
			});
		},
		destroy: destroy
	};

	function destroy() {
		return this.each(function () {
			var $this = $(this);
			var data = $this.data('endlessScrolling');
			if (data) {
				$this.removeData('endlessScrolling');
				$this.off('.endlessScrolling');
			}
		});
	}

	$.fn.endlessScrolling = function (method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on jQuery.endlessScrolling');
		}
	};

})(jQuery);