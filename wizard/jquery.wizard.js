/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
//https://decadecity.net/blog/2013/03/25/modal-windows-for-small-screens-using-bootstrap-and-vertical-media-queries
(function ($) {
    "use strict";

    function isRtl() {
        return $("body").css("direction") === "rtl";
    }

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

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $wizard = $(this);
                if (!$wizard.data("wizard")) {
                    $wizard.hide();
                    var settings = $.extend(true, {}, $.fn.wizard.defaults, $.dataset.parse($wizard.data()), options);
                    settings.skipValidationOnTabClick = false;
                    $wizard.addClass("wizard").css({
                        "float": "left",
                        "width": "100%"
                    });
                    var $tabs = $wizard.find(".nav:eq(0)");
                    $tabs.wrap($("<div />", {
                        "class": "wizard-steps",
                        css: {
                            "float": isRtl() ? "right" : "left",
                            "width": settings.size.stepsWidth
                        }
                    }));
                    var $tabContent = $wizard.children(".tab-content");
                    $tabContent.css({
                        "margin": isRtl() ? "10px 10px 10px 0" : "10px 0 10px 10px"
                    });
                    $tabContent.css({
                        "height": settings.size.tabContent.height,
                        "overflow": "auto"
                    });
                    $tabContent.wrap($("<div />", {
                        "class": "wizard-content",
                        css: {
                            "float": isRtl() ? "left" : "right"
                        }
                    }));
                    var $wizardContent = $wizard.find(".wizard-content");
                    $wizardContent.css({
                        width: settings.size.contentWidth
                    });
                    $wizardContent.prepend($("<div />", {
                        "class": "wizard-title",
                        css: {
                            "text-indent": "10px",
                            "font-size": "x-large",
                            "font-weight": "bold",
                            "height": "40px",
                            "line-height": "40px"
                        }
                    }));
                    $wizardContent.append($("<div />", {
                        "class": "wizard-buttons",
                        css: {
                            "text-align": isRtl() ? "left" : "right",
                        }
                    }));
                    if (settings.modal.active) {
                        var $wizardModal = $(".wizard-modal");
                        if ($wizardModal.length === 1) {
                            $wizardModal.remove();
                        }
                        var html =
                            "<div class='wizard-modal modal fade' tabindex='-1'>" +
                            "<div class='modal-dialog " + settings.modal.optionalSize + "'>" +
                            "<div class='modal-content'>" +
                            "<div class='modal-header'>" +
                            "<button type='button' class='close' data-dismiss='modal'>&times;</button>" +
                            "<h4 class='modal-title'>" + (settings.modal.title ? settings.modal.title : "&nbsp;") + "</h4>" +
                            "</div>" +
                            "<div class='modal-body'></div>" +
                            "</div>" +
                            "</div>" +
                            "</div>";
                        $("body").append(html);
                        $wizardModal = $(".wizard-modal");
                        if (settings.modal.width) {
                            var width = getWidth(settings.modal.width);
                            $wizardModal.css(width);
                        }
                        var $el = $wizard.parents("form");
                        if ($el.length === 0) {
                            $el = $wizard;
                        }
                        var $wizardModalBody = $wizardModal.find(".modal-body");
                        $wizardModalBody.css({
                            "max-height": "initial"
                        }).append($el);

                        if (settings.style.modalBodyBackgroundColor) {
                            $wizardModal.find(".modal-body").css('background-color', settings.style.modalBodyBackgroundColor);
                        }
                    }
                    var $wizardButtons = $wizardContent.find(".wizard-buttons");
                    $wizardButtons.append(
                        "<button type='button' class='btn disabled " + settings.style.previousButtonClass + "' data-button='previous'>" + settings.literals.previous + "</button>&nbsp;" +
                        "<button type='button' class='btn disabled " + settings.style.nextButtonClass + "' data-button='next'>" + settings.literals.next + "</button>&nbsp;" +
                        "<button type='button' class='btn disabled " + settings.style.finishButtonClass + "' data-button='finish'>" + settings.literals.finish + "</button>");
                    $wizardButtons.find("button").on("click.wizard", function (e) {
                        var $tab = $tabs.find(".active");
                        var step = settings.steps[$tab.index()]; // http://api.jquery.com/index/
                        switch ($(this).data("button")) {
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
                    $wizard.after("<div class='clear'></div>");
                    var steps = [];
                    var lis = $tabs.children();
                    lis.each(function (index, elem) {
                        var $elem = $(elem);
                        var $a = $elem.children();
                        var title = $elem.data("title") || $a.text();
                        var url = $elem.data("url");
                        var contentElement = $($a.attr("href"))[0];
                        var key = $elem.data("key");
                        var validate = $elem.data("validate");
                        if (validate === undefined) {
                            validate = false;
                        }
                        var step = new Step(title, url, $elem[0], contentElement, key, validate, $wizard);
                        steps.push(step);
                        if (index > 0) {
                            $elem.addClass("disabled");
                        }
                    });
                    settings.steps = steps;
                    $wizard.data("wizard", settings);
                    if (settings.whenToClickFirstStep === "init") {
                        $(steps[0].tabElement).children().click();
                    }
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
        whenToClickFirstStep: "init", //init, open
        zIndex: null,
        events: {
            onShow: null,
            onTabShow: null,
            onFinish: null,
            onValidate: null,
            onBeforeLoadUrl: null
        },
        style: {
            previousButtonClass: "btn-default",
            nextButtonClass: "btn-primary",
            finishButtonClass: "btn-success"
        },
        modal: {
            active: false,
            title: "",
            optionalSize: "",
            width: "",
            backdrop: true
        },
        literals: {
            previous: "Anterior",
            next: "Siguiente",
            finish: "Finalizar"
        },
        size: {
            stepsWidth: "20%",
            contentWidth: "80%",
            tabContent: {
                height: "400px"
            }
        }
    };
})(jQuery);