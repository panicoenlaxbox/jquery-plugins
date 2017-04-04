/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
(function ($) {
    "use strict";

    var pluginName = "elementToInput";

    var decimalSeparator = Globalize.culture().numberFormat["."];
    var thousandSeparator = Globalize.culture().numberFormat[","];

    function log(message, tag) {
        if (tag) {
            message = tag + ": " + message;
        }
        //console.log(message);
    }

    function getNextElement($el, $els, next, cyclicTabulation) {
        var index = $els.index($el);
        if (cyclicTabulation && index === 0 && !next) {
            return $els[$els.length - 1];
        } else if (cyclicTabulation && (index === $els.length - 1) && next) {
            return $els[0];
        } else {
            index = next ? index + 1 : index - 1;
            return $els[index];
        }
    }

    function getDataValueFromAttr($el) {
        var value = $el.attr("data-value");
        if (value === undefined) { // does not exist the data attribute            
            if (getData($el).type === "string") {
                value = $.trim($el.text());
            } else {
                value = ""; // value if data attribute is empty
            }
        }
        return $.trim(value.toString());
    }

    function isNumericType(type) {
        return type === "int" || type === "decimal" || type === "percentage";
    }

    function removeThousandSeparator(text) {
        var reg = new RegExp("\\" + thousandSeparator, "g");
        return text.replace(reg, "");
    }

    function getEventType(type) {
        return type + "." + pluginName;
    }

    function validate(text, $el) {
        var settings = getData($el);
        var type = settings.type,
            required = settings.required,
            min = settings.min,
            max = settings.max;
        text = $.trim(text);
        if (text === "" && required) {
            return false;
        }
        if (text && isNumericType(type)) {
            var value = parseText(text, type);
            if (isNaN(value)) {
                return false;
            }
            if (typeof min === "number") {
                if (value < min) {
                    return false;
                }
            }
            if (typeof max === "number") {
                if (value > max) {
                    return false;
                }
            }
        }
        return true;
    }

    function parseText(text, type) {
        if (!isNumericType(type)) {
            return text;
        }
        var value;
        if (type === "decimal" || type === "percentage") {
            value = Globalize.parseFloat(text);
        } else if (type === "int") {
            value = Globalize.parseInt(text);
        }
        return value;
    }

    function editing($el, active) {
        if (active) {
            $el.addClass("editing");
        } else {
            $el.removeClass("editing");
        }
        var closestSelector = getData($el).closestSelector;
        if (closestSelector) {
            var $parent = $el.closest(closestSelector);
            if (active) {
                $parent.addClass("editing");
            } else {
                $parent.removeClass("editing");
            }
        }
    }

    function invalid($el, active) {
        if (active) {
            $el.addClass("invalid");
        } else {
            $el.removeClass("invalid");
        }
        var closestSelector = getData($el).closestSelector;
        if (closestSelector) {
            var $parent = $el.closest(closestSelector);
            if (active) {
                $parent.addClass("invalid");
            } else {
                $parent.removeClass("invalid");
            }
        }
    }

    function fixFormattedNumber(value) {
        while (value.substr(value.length - 1, 1) === "0") {
            value = value.substring(0, value.length - 1);
        }
        if (value.substr(value.length - 1, 1) === decimalSeparator) {
            value = value.substring(0, value.length - 1);
        }
        return value;
    }

    function formatValue(value, type, decimals, removeThousand) {
        if (!isNumericType(type)) {
            return value;
        }
        if (type === "decimal" || type === "percentage") {
            value = Globalize.format(value, "n" + decimals);
            value = fixFormattedNumber(value);
            if (type === "percentage") {
                value += " %";
            }
        } else if (type === "int") {
            value = Globalize.format(value, "n0");
        }
        if (removeThousand) {
            value = removeThousandSeparator(value);
        }
        return value;
    }

    function createInput(value, inputStyle, inputClass, excelStyle) {
        var $input = $("<input type=\"text\" />");
        $input.val(value);
        $input.data("originalValue", value);
        $input.addClass("element_to_input");
        if (excelStyle) {
            $input.css({
                "border-width": 0,
                "border-radius": 0,
                "box-shadow": "none",
                "transition-property": "none",
                "padding": 0,
                "margin-bottom": 0,
                "height": "100%",
                "width": "100%"
            });
        }
        if (inputStyle) {
            $input.attr("style", inputStyle);
        }
        if (inputClass) {
            $input.addClass(inputClass);
        }
        return $input;
    }

    function initialize($el) {
        var text = getDataValueFromAttr($el);
        if (!validate(text, $el)) {
            invalid($el, true);
        }
        $el.on(getEventType("click"), click);
    }

    function click() {
        var $el = $(this);
        var settings = getData($el);
        setValue($el, "moveToNextElement", true);
        var previousText = $.trim($el.text());
        setValue($el, "previousText", previousText);
        var previousDataValue = getDataValueFromAttr($el);
        setValue($el, "previousDataValue", previousDataValue);
        var text = previousDataValue;
        var isValid = !$el.hasClass("invalid");
        if (isValid) {
            if (text !== "" && isNumericType(settings.type)) {
                var value;
                if (settings.type === "percentage") {
                    value = parseText(text, "decimal");
                    value *= 100;
                    text = formatValue(value, "decimal", settings.savedDecimals, !settings.editFormatted);
                } else if (settings.editFormatted) {
                    value = parseText(text, settings.type);
                    text = formatValue(value, settings.type, settings.savedDecimals, false);
                }
            }
            setValue($el, "previousValidText", previousText);
            setValue($el, "previousValidDataValue", previousDataValue);
        }
        var $input = createInput(text, settings.inputStyle, settings.inputClass, settings.excelStyle);
        $input.on(getEventType("click"), function (e) {
            editing($(this).parent(), true);
            e.stopPropagation();
        });
        $input.on(getEventType("blur"), blur);
        $input.on(getEventType("keydown"), keydown);
        $input.on(getEventType("keyup"), keyup);
        $el.empty();
        $el.append($input);
        $input.select();
        editing($el, true);
    }

    function getNumericValues(text, options) {
        if (text === "") {
            return {
                parsedValue: null,
                formattedValue: "",
                formattedText: ""
            }
        }
        var type = options.type;
        var displayedDecimals = options.displayedDecimals;
        var savedDecimals = options.savedDecimals;
        var parsedValue = parseText(text, type);
        var formattedValue;
        if (type === "percentage") {
            var percentage = parseText(text, "decimal");
            percentage /= 100;
            formattedValue = formatValue(percentage, "decimal", savedDecimals, true);
        } else {
            formattedValue = formatValue(parsedValue, type, savedDecimals, true);
        }
        var value = type === "decimal" || type === "percentage" ?
            parseFloat(parsedValue.toFixed(displayedDecimals)) :
            parsedValue;
        var formattedText = formatValue(value, type, displayedDecimals, false);
        return {
            parsedValue: parsedValue,
            formattedValue: formattedValue,
            formattedText: formattedText
        }
    }

    function blur() {
        var $input = $(this);
        var $el = $input.parent();
        var settings = getData($el);
        var cancel = settings.readonly || getValue($el, "esc") === true;
        if (cancel) {
            editing($el, false);
            invalid($el, $el.hasClass("invalid"));
            $input.remove();
            $el.text(getValue($el, "previousText"));
            removeValue($el, "esc");
            return;
        }
        var text = $.trim($input.val());
        var dataValue = text;
        var value;
        var isValid = validate(text, $el);
        if (isValid && isNumericType(settings.type)) {
            var values = getNumericValues(text, {
                type: settings.type,
                displayedDecimals: settings.displayedDecimals,
                savedDecimals: settings.savedDecimals
            });
            text = values.formattedText;
            dataValue = values.formattedValue;
            value = values.parsedValue;
        } else {
            value = null;
        }
        editing($el, false);
        invalid($el, !isValid);
        $input.remove();
        $el.text(text);
        setValue($el, "value", dataValue, true);
        var originalValue = $el.attr("data-original-value");
        var dirty = originalValue !== dataValue;
        originalValue = originalValue ? parseText(originalValue, settings.type) : null;
        setValue($el, "dirty", dirty, true);
        var previousText = getValue($el, "previousText");
        var previousDataValue = getValue($el, "previousDataValue");
        var previousValidText = getValue($el, "previousValidText");
        var previousValidDataValue = getValue($el, "previousValidDataValue");
        var data = {
            previousValue: validate(previousText, $el) && previousText !== "" ?
                parseText(previousDataValue, settings.type) : null,
            previousDataValue: previousDataValue,
            previousText: previousText,
            previousValidValue: previousValidText ? parseText(previousValidDataValue, settings.type) : null,
            previousValidDataValue: previousValidDataValue,
            previousValidText: previousValidText,
            value: value,
            dataValue: dataValue,
            text: text,
            hasValue: !!dataValue,
            hasChangedValue: previousDataValue !== dataValue,
            isValid: isValid,
            originalValue: originalValue,
            hasChangedOriginalValue: originalValue !== value,
            dirty: dirty
        };
        var onChangedReturnValue = true;
        if (data.hasChangedValue) {
            onChangedReturnValue = (settings.events.onChanged || $.noop)($el, data);
        }
        setValue($el, "moveToNextElement", onChangedReturnValue === false ? false : true);
        removeValue($el, "esc");
    }

    function setValue($el, key, value, synchronizeAttr) {
        getData($el)[key] = value;
        if (synchronizeAttr === true) {
            $el.attr("data-" + key, value);
        }
    }

    function getValue($el, key) {
        return getData($el)[key];
    }

    function removeValue($el, key) {
        delete getData($el)[key];
    }

    function keydown(e) {
        //http://stackoverflow.com/a/19689615        
        var isEsc = e.keyCode === 27;
        var isTab = e.keyCode === 9;
        var isEnter = e.keyCode === 13;
        var isShift = e.shiftKey;
        var isUpArrow = e.keyCode === 38;
        var isRightArrow = e.keyCode === 39;
        var isDownArrow = e.keyCode === 40;
        var isLeftArrow = e.keyCode === 37;
        var isArrow = isUpArrow || isRightArrow || isDownArrow || isLeftArrow;
        var $input = $(this);
        var $el = $input.parent();
        var settings = getData($el);
        if (settings.readonly && !(isEsc || isTab || isEnter || isArrow)) {
            e.preventDefault();
            return;
        }
        if (isEsc || isTab || isEnter || isUpArrow || isDownArrow) {
            e.preventDefault();
            if (isEsc) {
                setValue($el, "esc", true);
            }
            $input.blur();
            if (isEsc) {
                return;
            }
            var moveToNextElement = getValue($el, "moveToNextElement");
            if (!moveToNextElement) {
                return;
            }
            var next = true;
            if ((isTab && isShift) || isUpArrow) {
                next = false;
            }
            var siblings = settings.siblings;
            if (!siblings) {
                return;
            } else if (!(siblings instanceof jQuery)) {
                siblings = $(siblings);
            }
            var nextElement = getNextElement($el, siblings, next, settings.cyclicTabulation);
            if (nextElement) {
                $(nextElement).click();
            }
        }
        if (isNumericType(settings.type)) {
            var isNumpadComma = e.keyCode === 110;
            if (isNumpadComma) {
                e.preventDefault();
                $input.caret(decimalSeparator);
            }
        }
    }

    function getData($el) {
        return $el.data(pluginName);
    }

    function keyup() {
        var $input = $(this);
        var settings = $input.parent().data(pluginName);
        var currentValue = $input.val();
        if (
            settings.readonly ||
            !settings.editFormatted ||
            !isNumericType(settings.type) ||
            $.trim(currentValue) === "") {
            return;
        }
        var lastCharacter = (currentValue.substring(currentValue.length - 1));
        if (lastCharacter === decimalSeparator || lastCharacter === "0") {
            return;
        }
        var parsedValue = parseText(currentValue, settings.type);
        if (isNaN(parsedValue)) {
            return;
        }
        var caretPosition = $input.caret();
        var currentNumberOfThousandSeparator = getNumberOfThousandSeparator(currentValue);
        var newValue = formatValue(parsedValue, settings.type === "percentage" ? "decimal" : settings.type, settings.savedDecimals, false);
        var newNumberOfThousandSeparator = getNumberOfThousandSeparator(newValue);
        if (newValue !== currentValue) {
            $input.val(newValue);
            if (currentNumberOfThousandSeparator < newNumberOfThousandSeparator) {
                caretPosition++;
            } else if (currentNumberOfThousandSeparator > newNumberOfThousandSeparator) {
                caretPosition--;
            }
            $input.caret(caretPosition);
        }
    }

    function getNumberOfThousandSeparator(value) {
        var pattern = "\\" + thousandSeparator;
        var regex = new RegExp(pattern, "g");
        return (value.match(regex) || []).length;
    }

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $this = $(this);
                if (!$this.data(pluginName)) {
                    var dataSet = parseDataSet($this.data());
                    var settings = $.extend(true, {}, $.fn[pluginName].defaults, dataSet, options);
                    settings._originalDataSet = JSON.stringify(dataSet);
                    settings.dirty = false;
                    $this.data(pluginName, settings);
                    initialize($this);
                }
            });
        },
        destroy: function () {
            return this.each(function () {
                var $this = $(this);
                var data = $this.data(pluginName);
                if (data) {
                    $this.empty();
                    $this.removeClass("editing");
                    $this.removeClass("invalid");
                    $this.removeData(pluginName);
                    restoreDataSet($this[0], JSON.parse(data._originalDataSet));
                    $this.off("." + pluginName);
                }
            });
        }
    };

    $.fn[pluginName] = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + method + " does not exist on jQuery." + pluginName);
        }
    };

    $.fn[pluginName].defaults = {
        min: null,
        max: null,
        type: "int", //int, decimal, percentage, string
        displayedDecimals: 2,
        savedDecimals: 2,
        required: false,
        inputClass: null,
        inputStyle: null,
        closestSelector: null,
        readonly: false,
        siblings: null,
        editFormatted: true,
        events: {
            onChanged: null
        },
        tag: null,
        excelStyle: true,
        cyclicTabulation: true
    };

    $.extend({
        elementToInput: (function () {
            return {
                setElement: function ($el, text, dataValue) {
                    if (!($el instanceof jQuery)) {
                        $el = $($el);
                    }
                    setValue($el, "value", dataValue, true);
                    var dirty = $el.text() !== text;
                    $el.text(text);
                    if (!validate(text, $el)) {
                        invalid($el, true);
                    }
                    $.elementToInput.setDirty($el, dirty);
                },
                setDirty: function ($el, dirty) {
                    if (!($el instanceof jQuery)) {
                        $el = $($el);
                    }
                    setValue($el, "dirty", dirty, true);
                },
                getNumericValues: function ($el) {
                    if (!($el instanceof jQuery)) {
                        $el = $($el);
                    }
                    var isValid = !$el.hasClass("invalid");
                    var data = getData($el);
                    var type = data.type;
                    if (!isValid || !isNumericType(type)) {
                        return null;
                    }
                    var values = getNumericValues($el.text(), {
                        type: data.type,
                        displayedDecimals: data.displayedDecimals,
                        savedDecimals: data.savedDecimals
                    });
                    return values;
                }
            }
        })()
    });
})(jQuery);