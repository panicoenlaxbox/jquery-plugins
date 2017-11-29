/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
//https://decadecity.net/blog/2013/03/25/modal-windows-for-small-screens-using-bootstrap-and-vertical-media-queries
(function ($) {
    "use strict";

    function manageButton($wizard, dataButton, disabled) {
        var $button = $wizard.find("[data-button='" + dataButton + "']");
        if (disabled) {
            $button.attr("disabled", "disabled").addClass("disabled");
        } else {
            $button.removeAttr("disabled").removeClass("disabled");
        }
    }

    function manageButtons($tab) {
        var disablePrev = true;
        var disableNext = true;
        var disableFinish = true;
        var previousTab = $tab.prev();
        if (previousTab.length === 1) {
            disablePrev = false;
        }
        var $nextTab = $tab.next();
        if ($nextTab.length === 1) {
            disableNext = false;
        } else {
            disableFinish = false;
        }
        var $wizard = $tab.parents(".wizard");
        manageButton($wizard, "previous", disablePrev);
        manageButton($wizard, "next", disableNext);
        manageButton($wizard, "finish", disableFinish);
    }

    function Step(title, url, tabElement, contentElement, key, validate, $wizard) {
        var self = this;
        self.title = title;
        self.url = url === undefined ? "" : url;
        self.urlLoaded = false;
        self.tabElement = tabElement;
        self.contentElement = contentElement;
        self.key = key || "";
        self.validate = validate === undefined ? false : validate;
        $(self.tabElement).children().on("click.wizard", function (e) {
            e.preventDefault();
            var $this = $(this);
            if ($this.parent().hasClass("disabled")) {
                return;
            }
            var settings = $wizard.data("wizard");
            if (!settings.skipValidationOnTabClick && settings.currentTab) {
                var currentIndex = [$(settings.currentTab).index()];
                var index = $this.parent().index();
                if (index > currentIndex) {
                    var currentStep = settings.steps[currentIndex];
                    if (currentStep.validate) {
                        if (!currentStep.validate($wizard.data("wizard").events.onValidate)) {
                            return;
                        }
                    }
                }
            }
            settings.skipValidationOnTabClick = false;
            if (!self.url || self.urlLoaded) {
                $this.tab("show");
                manageButtons($this.parent());
            } else {
                url = self.url;
                if (settings.events.onBeforeLoadUrl) {
                    var returnValue = settings.events.onBeforeLoadUrl(self);
                    if (typeof returnValue === "string") {
                        url = returnValue;
                    } else if (typeof returnValue === "boolean" && returnValue === false) {
                        $this.parent().addClass("disabled");
                        return;
                    }
                }
                tab.ajax.load({
                    el: self.contentElement,
                    url: url,
                    overlay: {
                        el: $wizard
                    }
                }).done(function () {
                    var $form = $(self.contentElement).parents("form");
                    if ($form.length === 1) {
                        $.validator.unobtrusive.parse($form);
                    }
                    $this.tab("show");
                    manageButtons($this.parent());
                    self.urlLoaded = true;
                }).fail(function (jqXHR) {
                    $this.parent().addClass("disabled");
                });
            }
        }).on("shown.bs.tab", function (e) {
            $wizard.data("wizard").currentTab = $(e.target).parent()[0];
            $wizard.find(".wizard-title").html(self.title);
        }).on("show.bs.tab", function (e) {
            var settings = $wizard.data("wizard");
            if (settings.events.onTabShow) {
                settings.events.onTabShow($wizard, self);
            }
        });
        self.validate = function (callback) {
            var isValid = true;
            var $form = $(self.contentElement).parents("form");
            if ($form.length === 1 && $form.data("validator")) {
                // How can I enable jquery validation on readonly fields?
                // http://stackoverflow.com/questions/26838839/how-can-i-enable-jquery-validation-on-readonly-fields
                var $els = $form.find("[readonly]");
                $els.each(function () {
                    $(this).removeAttr("readonly");
                });
                isValid = $form.valid();
                $els.each(function () {
                    $(this).attr("readonly", "readonly");
                });
            }
            if (!isValid) {
                return false;
            } else {
                if (callback) {
                    isValid = callback(self);
                }
                return isValid;
            }
        };
    }

    function getWidth(width) {
        var css = {
            width: width,
            "margin-left": "-" + (parseInt(width, 10) / 2)
        };
        if (width.indexOf("%") !== -1) {
            css["margin-left"] += "%";
        }
        return css;
    }

    // function Step2(id, name, title) {
    //     var self = this;
    //     self.id = id;
    //     self.name = name;
    //     self.title = title;
    // }

    function getHtml(title, steps, buttons) {
        var html =
        "<div class='wizard'>\n" +
        "\t<div class='wizard__title'>" + title +"</div>\n" +
        "\t<div class='wizard__nav'>\n" +
        "\t\t<ul class='nav nav-pills nav-stacked'>\n";
        steps.forEach(function(step) {
            html += 
                "\t\t\t<li>\n" +
                "\t\t\t\t<a href='#" + step.id + "' role='tab' data-toggle='tab'>" + step.name + "</a>\n" +
                "\t\t\t</li>\n";    
        });
        html +=
        "\t\t</ul>  \n" +
        "\t</div>\n" +
        "\t<div class='wizard__content'>\n" +
        "\t\t<div class='tab-content wizard-content-outer-container''>\n";
        steps.forEach(function(step) {
            html += 
                "\t\t\t<div class='tab-pane wizard-content-outer-container' id='home'>" +
                    "\t\t\t\t<div class='wizard-content-inner-container__title'>"+ step.title + "</div\n" +
                    "\t\t\t\t<div class='wizard-content-inner-container__content'></div\n" +
                "\t\t\t</div>\n";
            
        });
        "\t\t</div>\n" +                        
        "\t</div>\n" +
        "\t<div class='wizard__footer'>\n" +
        "\t\t<input type='button' data-role='previous' value='" + buttons.previous.text +"'>\n" +
        "\t\t<input type='button' data-role='next' value='" + buttons.next.text +"'>\n" +
        "\t\t<input type='button' data-role='finalize' value='" + buttons.finalize.text +"'>\n" +
        "\t</div>\n" +
        "</div>";
    }

    function createOverlay(zIndex, opacity, backgroundColor) {
        return $("<div />", {
            "data-role": "wizard-overlay",
            css: {
                "position": "fixed",
                "top": 0,
                "right": 0,
                "left": 0,
                "bottom": 0,
                "opacity": opacity,
                "background-color": backgroundColor,
                "z-index": zIndex
            }
        });
    }

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $wizard = $(this);
                if (!$wizard.data("wizard")) {
                    var settings = $.extend(true, {}, $.fn.wizard.defaults, $.dataset.parse($wizard.data()), options);
                    var html = getHtml(settings.title, settings.steps, settings.buttons);
                    var $overlay = createOverlay(1, settings.overlay.style.opacity, settings.overlay.style.backgroundColor);
                    $("body").append($overlay);
                    var $el = $(html);
                    $el.find(".wizard__footer input").on("click", function (e) {
                        var $tab = $el.find("[data-toggle='tab'] .active");
                        switch ($(this).data("role")) {
                            case "previous":
                                var previousTab = $tab.prev();
                                if (previousTab.length === 1) {
                                    previousTab.children().click();
                                }
                                break;
                            case "next":
                                var nextTab = $tab.next();
                                if (step.validate) {
                                    if (step.validate(settings.events.onValidate)) {
                                        nextTab.removeClass("disabled");
                                        settings.skipValidationOnTabClick = true;
                                    } else {
                                        return;
                                    }
                                } else {
                                    nextTab.removeClass("disabled");
                                }
                                nextTab.children().click();
                                break;
                            case "finish":
                                if (step.validate) {
                                    if (!step.validate(settings.events.onValidate)) {
                                        return;
                                    }
                                }
                                settings.events.onFinish($wizard);
                                break;
                        }
                    });
                    $wizard.data("wizard", settings);
                    $el.find("[data-toggle='tab']:eq(0)").click();
                }
            });
        },
        open: function (reset) {
            if (reset) {
                methods.resetAllAjaxSteps.call(this);
            }
            return this.each(function () {
                var $this = $(this);
                var settings = $this.data("wizard");
                var callback = function () {
                    if (settings.events.onShow) {
                        settings.events.onShow($this);
                    }
                    if (settings.whenToClickFirstStep === "open") {
                        $(settings.steps[0].tabElement).children().click();
                    }
                };
                if (settings.modal.active) {
                    $this.show(function () {
                        var $modal = $this.parents(".wizard-modal");
                        $modal.one("shown.bs.modal", callback);
                        $modal.modal({
                            show: true,
                            backdrop: settings.modal.backdrop
                        });
                    });
                } else {
                    $this.show(callback);
                }
            });
        },
        close: function () {
            return this.each(function () {
                var $this = $(this);
                $this.hide();
                if ($this.data("wizard").modal.active) {
                    $this.parents(".wizard-modal").modal("hide");
                }
            });
        },
        step: function (key) {
            var step;
            $.each(this.data("wizard").steps, function (index, value) {
                if (value.key === key) {
                    step = value;
                    return false;
                }
            });
            return step;
        },
        modalTitle: function (title) {
            return this.each(function () {
                var $this = $(this);
                if ($this.data("wizard").modal.active) {
                    $this.data("wizard").modal.title = title;
                    $this.parents(".modal-dialog").find(".modal-title").html(title);
                }
            });
        },
        resetAjaxStep: function (key) {
            if (typeof key === "string") {
                key = [key];
            }
            var self = this;
            $.each(key, function (index, element) {
                var step = methods.step.call(self, element);
                $(step.contentElement).empty();
                step.urlLoaded = false;
            });
        },
        resetAllAjaxSteps: function () {
            var steps = this.data("wizard").steps.map(function (currentValue) {
                return currentValue.key;
            });
            methods.resetAjaxStep.call(this, steps);
        }
    };

    $.fn.wizard = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + method + " does not exist on jQuery.wizard");
        }
    };

    $.fn.wizard.defaults = {
        title: null,
        events: {
            onShow: null,
            onTabShow: null,
            onFinish: null,
            onValidate: null,
            onBeforeLoadUrl: null
        },
        buttons: {
            previous: {
                text: "Anterior",
                className: "btn-default"
            },
            next: {
                text: "Siguiente",
                className: "btn-primary"
            },
            finalize: {
                text: "Finalizar",
                className: "btn-success"
            },
        },
        steps: [],
        overlay: {
            style: {
                backgroundColor: "#000",
                opacity: 0.5
            }
        }
    };
})(jQuery);