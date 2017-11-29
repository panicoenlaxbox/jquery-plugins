/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
(function ($) {
    "use strict";

    function getHtml(title, steps, buttons) {
        var html =
            "<div class='wizard'>\n" +
            "\t<div class='wizard__title'>" + title + "</div>\n" +
            "\t<div class='wizard__nav'>\n" +
            "\t\t<ul class='nav nav-pills nav-stacked'>\n";
        $.each(steps, function (index, element) {
            html +=
                "\t\t\t<li" + (index === 0 ? " class='active'" : "") + ">\n" +
                "\t\t\t\t<a href='#" + element.id + "' role='tab' data-toggle='tab'>" + element.name + "</a>\n" +
                "\t\t\t</li>\n";
        });
        html +=
            "\t\t</ul>  \n" +
            "\t</div>\n" +
            "\t<div class='wizard__content'>\n" +
            "\t\t<div class='tab-content wizard-content-outer-container'>\n";
        $.each(steps, function (index, element) {
            html +=
                "\t\t\t<div class='tab-pane" + (index === 0 ? " active" : "") + " wizard-content-outer-container' id='" + element.id + "'>\n" +
                "\t\t\t\t<div class='wizard-content-inner-container__title'>" + element.title + "</div>\n" +
                "\t\t\t\t<div class='wizard-content-inner-container__content' data-id='" + element.id + "'></div>\n" +
                "\t\t\t</div>\n";
        });
        html +=
            "\t\t</div>\n" +
            "\t</div>\n" +
            "\t<div class='wizard__footer'>\n" +
            "\t\t<input type='button' data-role='previous' value='" + buttons.previous.text + "'>\n" +
            "\t\t<input type='button' data-role='next' value='" + buttons.next.text + "'>\n" +
            "\t\t<input type='button' data-role='finish' value='" + buttons.finish.text + "'>\n" +
            "\t</div>\n" +
            "</div>";

        return html;
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

    function setButtonsAvailabilityByStep(step) {
        var disablePrev = false;
        var disableNext = false;
        var disableFinish = false;
        if (!step.$tab.parent().prev().exists()) {
            disablePrev = true;
        }
        if (!step.$tab.parent().next().exists()) {
            disableNext = true;
        } else {
            disableFinish = true;
        }
        var $wizard = step.$tab.parents("[data-role='wizard']");
        setButtonsAvailability($wizard, !disablePrev, !disableNext, !disableFinish);
    }

    function setButtonsAvailability($wizard, previous, next, finish) {
        setButtonAvailability($wizard.find("input[data-role='previous']"), previous);
        setButtonAvailability($wizard.find("input[data-role='next']"), next);
        setButtonAvailability($wizard.find("input[data-role='finish']"), finish);
    }

    function setButtonAvailability($button, enabled) {
        if (enabled) {
            $button.removeAttr("disabled");
        } else {
            $button.attr("disabled", "disabled");
        }
    }

    function disableButtons() {
        setButtonsAvailability($wizard, false, false, false);
    }

    function Step(data) {
        this.id = data.id;
        this.name = data.name;
        this.title = data.title;
        this.validate = data.validate === undefined ? false : data.validate;
        this.$tab = null;
        this.$content = null;
        this.index = 0;
        this.hasPrevious = function () {
            return this.index > 0;
        };
        this.ajax = $.extend(true, {}, {
            url: null,
            checkSelector: null
        }, data.ajax);
        if (data.content) {
            if (data.content instanceof jQuery) {
                this.$content = data.content;
            } else {
                this.$content = $(data.content);
            }
        }
    }

    function getStep($tab) {
        var $wizard = $tab.parents("[data-role='wizard']");
        var index = $wizard.find(".wizard__nav [data-toggle='tab']").index($tab);
        return $wizard.data("wizard").steps[index];
    }

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $wizard = $(this);
                if (!$wizard.data("wizard")) {
                    var settings = $.extend(true, {}, $.fn.wizard.defaults, $.dataset.parse($wizard.data()), options);
                    settings.steps = settings.steps.map(function (element) {
                        return new Step(element);
                    });
                    var html = getHtml(settings.title, settings.steps, settings.buttons);
                    var $html = $(html);
                    settings.steps.forEach(function (element, index) {
                        element.index = index;
                        element.$tab = $html.find(".wizard__nav [href='#" + element.id + "']");
                        if (element.$content) {
                            element.$content.detach().appendTo($html.find("[data-id='" + element.id + "']"));
                        }
                        element.$content = $html.find("[data-id='" + element.id + "']");
                    });
                    var $overlay = createOverlay(0, settings.overlay.style.opacity, settings.overlay.style.backgroundColor);
                    $("body").append($overlay);
                    $wizard.append($html);
                    $wizard.css({
                        "position": "absolute",
                        "top": "50%",
                        "left": "50%",
                        "transform": "translate(-50%, -50%)",
                        "z-index": 1
                    }).attr("data-role", "wizard");
                    $wizard.find(".wizard__footer input").on("click", function (e) {
                        var $currentTab = $wizard.find(".wizard__nav .active [data-toggle='tab']");
                        var role = $(this).data("role");
                        switch (role) {
                            case "previous":
                                $currentTab.parent().prev().children().tab("show");
                                break;
                            case "next":
                                $currentTab.parent().next().children().tab("show");
                                break;
                            case "finish":
                                settings.events.onFinish();
                                break;
                        }
                    });

                    $wizard.find(".wizard__nav [data-toggle='tab']").on("show.bs.tab", function (e) {
                        var newStep = getStep($(e.target));
                        var currentStep = getStep($(e.relatedTarget));

                        var backward = newStep.index < currentStep.index;
                        if (backward) {
                            return;
                        }

                        if (currentStep.validate && !("_ignore_validation" in newStep)) {
                            setTimeout(function () {
                                $wizard.block();
                                settings.events.onValidate(currentStep).done(function () {
                                    newStep._ignore_validation = true;
                                    newStep.$tab.tab("show");
                                }).always(function () {
                                    $wizard.unblock();
                                });
                            }, 0);
                            return false;
                        }
                        delete newStep._ignore_validation;

                        var loadUrl = (newStep.ajax.url && !("_ignore_next_url" in newStep) && (newStep.$content.is(":empty") || (!newStep.$content.is(":empty") && newStep.ajax.checkSelector && !$(checkSelector, newStep.$content).exists())));
                        if (loadUrl) {
                            var url = (settings.events.onBeforeLoadUrl || $.noop)(newStep, newStep.ajax.url);
                            if (!url) {
                                url = newStep.ajax.url;
                            }
                            setTimeout(function () {
                                $wizard.block();
                                $.loadUrl(newStep.$content, url).done(function (data, textStatus, jqXHR) {
                                    newStep._ignore_validation = true;
                                    newStep._ignore_next_url = true;
                                    newStep.$tab.tab("show");
                                    (settings.events.onAjaxDone || $.noop)(newStep, data, textStatus, jqXHR);
                                }).fail(function (jqXHR, textStatus, errorThrown) {
                                    (settings.events.onAjaxFail || $.noop)(newStep, jqXHR, textStatus, errorThrown);
                                }).always(function () {
                                    $wizard.unblock();
                                });

                            }, 0);
                            return false;
                        }
                        delete newStep._ignore_next_url;

                    });
                    $wizard.find(".wizard__nav [data-toggle='tab']").on("shown.bs.tab", function (e) {
                        var currentStep = getStep($(e.target));
                        setButtonsAvailabilityByStep(currentStep);
                    });
                    $wizard.data("wizard", settings);
                    setButtonsAvailabilityByStep(settings.steps[0]);
                }
            });
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
            onValidate: null,
            onAjaxDone: null,
            onAjaxFail: null,
            onFinish: null,
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
            finish: {
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