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

    function getjQueryElement(el) {
        if (el instanceof jQuery) {
            return el;
        }
        return $(el);
    }

    function getNextElement($el, next) {
        var data = getData($el);
        if (!data.siblings) {
            return null;
        }
        var $siblings = data.siblings;
        var index = $siblings.index($el);
        if (data.cyclicTabulation && index === 0 && !next) {
            return $siblings[$siblings.length - 1];
        } else if (data.cyclicTabulation && (index === $siblings.length - 1) && next) {
            return $siblings[0];
        } else {
            index = next ? index + 1 : index - 1;
            return $siblings[index];
        }
    }

    function getDataValue($el) {
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
        return isIntegerType(type) || isDecimalType(type);
    }

    function isIntegerType(type) {
        return type === "int";
    }

    function isDecimalType(type) {
        return ["decimal", "percentage", "currency"].indexOf(type) !== -1;
    }

    function removeThousandSeparator(text) {
        var regex = new RegExp("\\" + thousandSeparator, "g");
        return text.replace(regex, "");
    }

    function event(type) {
        return type + "." + pluginName;
    }

    function parseText(text, type) {
        if (!isNumericType(type)) {
            return text;
        }
        var value;
        if (isDecimalType(type)) {
            value = Globalize.parseFloat(text);
        } else if (type === "int") {
            value = Globalize.parseInt(text);
        }
        return value;
    }

    function trailingZero(value) {
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
        var format;
        switch (type) {
            case "int":
                format: "n0"
            case "decimal":
                format = "n" + decimals;
                break;
            case "percentage":
                format = "p" + decimals;
                break;
            case "currency":
                format = "c" + decimals;
                break;
        }
        value = Globalize.format(value, format);
        value = trailingZero(value);
        if (removeThousand) {
            value = removeThousandSeparator(value);
        }
        return value;
    }

    function createInput($el, value) {
        var $input = $("<input type=\"text\" />");
        $input.val(value);
        $input.data("originalValue", value);
        $input.addClass("element_to_input");
        var data = getData($el);
        if (data.excelStyle) {
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
        if (data.inputStyle) {
            $input.attr("style", data.inputStyle);
        }
        if (data.inputClass) {
            $input.addClass(data.inputClass);
        }
        return $input;
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

    function getData($el) {
        return $el.data(pluginName);
    }

    function getNumberOfThousandSeparator(value) {
        var pattern = "\\" + thousandSeparator;
        var regex = new RegExp(pattern, "g");
        return (value.match(regex) || []).length;
    }

    function getNumericValues(text, options) {
        if (text === "") {
            return {
                parsedValue: null,
                formattedValue: "",
                formattedText: ""
            }
        }
        var parsedValue = parseText(text, options.type);
        var formattedValue;
        var value;
        if (options.type === "percentage") {
            parsedValue /= 100;
            formattedValue = formatValue(parsedValue, "decimal", options.savedDecimals + 2, true);
            value = parseFloat(parsedValue.toFixed(options.displayedDecimals + 2));
        } else {
            formattedValue = formatValue(parsedValue, isDecimalType(options.type) ? "decimal" : "int", options.savedDecimals, true);
            value = isDecimalType(options.type) ? parseFloat(parsedValue.toFixed(options.displayedDecimals)) : parsedValue;
        }
        var formattedText = formatValue(value, options.type, options.displayedDecimals, false);
        return {
            parsedValue: parsedValue,
            formattedValue: formattedValue,
            formattedText: formattedText
        }
    }

    function validate($el, text) {
        var data = getData($el);
        text = $.trim(text);
        if (text === "" && data.required) {
            return false;
        }
        if (text && isNumericType(data.type)) {
            var value = parseText(text, data.type);
            if (isNaN(value)) {
                return false;
            }
            if (!data.allowNegative && value < 0) {
                return false;
            }
            if (typeof data.min === "number") {
                if (value < data.min) {
                    return false;
                }
            }
            if (typeof data.max === "number") {
                if (value > data.max) {
                    return false;
                }
            }
        }
        return true;
    }

    function editing($el, active) {
        if (active) {
            $el.addClass("editing");
        } else {
            $el.removeClass("editing");
        }
        var selector = getData($el).closestSelector;
        if (selector) {
            var $parent = $el.closest(selector);
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
        var selector = getData($el).closestSelector;
        if (selector) {
            var $parent = $el.closest(selector);
            if (active) {
                $parent.addClass("invalid");
            } else {
                $parent.removeClass("invalid");
            }
        }
    }

    function initialize($el) {
        if (!validate($el, getDataValue($el))) {
            invalid($el, true);
        }
        $el.on(event("click"), click);
    }

    function click() {
        var $el = $(this);
        var data = getData($el);
        setValue($el, "moveToNextElement", true);
        var previousText = $.trim($el.text());
        setValue($el, "previousText", previousText);
        var previousDataValue = getDataValue($el);
        setValue($el, "previousDataValue", previousDataValue);
        var text = previousDataValue;
        var isValid = !$el.hasClass("invalid");
        if (isValid) {
            if (text !== "" && isNumericType(data.type)) {
                var value;
                if (data.type === "percentage") {
                    value = parseText(text, "decimal") * 100;
                    // achieve a text that user can edit without percent sign
                    text = formatValue(value, "decimal", data.savedDecimals, !data.editFormatted);
                } else if (data.editFormatted) {
                    value = parseText(text, data.type);
                    text = formatValue(value, data.type === "currency" ? "decimal" : data.type, data.savedDecimals, false);
                }
            }
            setValue($el, "previousValidText", previousText);
            setValue($el, "previousValidDataValue", previousDataValue);
        }
        var $input = createInput($el, text);
        $input.on(event("click"), function (e) {
            editing($(this).parent(), true);
            e.stopPropagation();
        });
        $input.on(event("blur"), blur);
        $input.on(event("keydown"), keydown);
        $input.on(event("keyup"), keyup);
        $el.empty();
        $el.append($input);
        $input.select();
        editing($el, true);
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
        var data = getData($el);
        if (data.readonly && !(isEsc || isTab || isEnter || isArrow)) {
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
            var nextElement = getNextElement($el, next);
            if (nextElement) {
                $(nextElement).click();
            }
        }
        if (isNumericType(data.type)) {
            var isNumpadComma = e.keyCode === 110;
            if (isNumpadComma) {
                e.preventDefault();
                setCaretPosition($input[0], decimalSeparator);
            }
        }
    }

    function keyup() {
        var $input = $(this);
        var data = getData($input.parent());
        var currentValue = $input.val();
        if (
            data.readonly ||
            !data.editFormatted ||
            !isNumericType(data.type) ||
            $.trim(currentValue) === "") {
            return;
        }
        var lastCharacter = (currentValue.substring(currentValue.length - 1));
        if (lastCharacter === decimalSeparator || lastCharacter === "0") {
            return;
        }
        var parsedValue = parseText(currentValue, data.type);
        if (isNaN(parsedValue)) {
            return;
        }
        var caretPosition = getCaretPosition($input[0]);
        var currentNumberOfThousandSeparator = getNumberOfThousandSeparator(currentValue);
        var newValue = formatValue(parsedValue, isDecimalType(data.type) ? "decimal" : "int", data.savedDecimals, false);
        var newNumberOfThousandSeparator = getNumberOfThousandSeparator(newValue);
        if (newValue !== currentValue) {
            $input.val(newValue);
            if (currentNumberOfThousandSeparator < newNumberOfThousandSeparator) {
                caretPosition++;
            } else if (currentNumberOfThousandSeparator > newNumberOfThousandSeparator) {
                caretPosition--;
            }
            setCaretPosition($input[0], caretPosition);
        }
    }

    function getCaretPosition(input) {
        return input.selectionStart;
    }

    function setSelectionRange(input, selectionStart, selectionEnd) {
        if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(selectionStart, selectionEnd);
        } else if (input.createTextRange) {
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd('character', selectionEnd);
            range.moveStart('character', selectionStart);
            range.select();
        }
    }

    function setCaretPosition(input, position) {
        setSelectionRange(input, position, position);
    }

    function blur() {
        var $input = $(this);
        var $el = $input.parent();
        var data = getData($el);
        var cancel = data.readonly || getValue($el, "esc") === true;
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
        var isValid = validate($el, text);
        if (isValid && isNumericType(data.type)) {
            var values = getNumericValues(text, {
                type: data.type,
                displayedDecimals: data.displayedDecimals,
                savedDecimals: data.savedDecimals
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
        originalValue = originalValue ? parseText(originalValue, data.type) : null;
        setValue($el, "dirty", dirty, true);
        var previousText = getValue($el, "previousText");
        var previousDataValue = getValue($el, "previousDataValue");
        var previousValidText = getValue($el, "previousValidText");
        var previousValidDataValue = getValue($el, "previousValidDataValue");
        var eventData = {
            previousValue: validate($el, previousText) && previousText !== "" ?
                parseText(previousDataValue, data.type) : null,
            previousDataValue: previousDataValue,
            previousText: previousText,
            previousValidValue: previousValidText ? parseText(previousValidDataValue, data.type) : null,
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
        log(eventData, data.tag);
        var onChangedReturnValue = true;
        if (eventData.hasChangedValue) {
            onChangedReturnValue = (data.events.onChanged || $.noop)($el, eventData);
        }
        setValue($el, "moveToNextElement", onChangedReturnValue === false ? false : true);
        removeValue($el, "esc");
    }

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $this = $(this);
                if (!$this.data(pluginName)) {
                    var dataSet = parseDataSet($this.data());
                    var data = $.extend(true, {}, $.fn[pluginName].defaults, dataSet, options);
                    data._originalDataSet = JSON.stringify(dataSet);
                    if (data.siblings && !(data.siblings instanceof jQuery)) {
                        data.siblings = $(data.siblings);
                    }
                    $this.data(pluginName, data);
                    initialize($this);
                }
            });
        },
        destroy: function () {
            return this.each(function () {
                var $this = $(this);
                var data = getData($this);
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
        type: "int", //int, decimal, percentage, currency, string
        allowNegative: true,
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
                    $el = getjQueryElement($el);
                    setValue($el, "value", dataValue, true);
                    var dirty = $el.text() !== text;
                    $el.text(text);
                    if (!validate($el, text)) {
                        invalid($el, true);
                    }
                    $.elementToInput.setDirty($el, dirty);
                },
                setDirty: function ($el, dirty) {
                    $el = getjQueryElement($el);
                    setValue($el, "dirty", dirty, true);
                },
                getNumericValues: function ($el) {
                    $el = getjQueryElement($el);
                    if ($el[0].tagName.toUpperCase() === "INPUT") {
                        $el = $input.parent();
                    }
                    var isValid = !$el.hasClass("invalid");
                    var data = getData($el);
                    if (!isValid || !isNumericType(data.type)) {
                        return null;
                    }
                    return getNumericValues($.trim($el.text()), {
                        type: data.type,
                        displayedDecimals: data.displayedDecimals,
                        savedDecimals: data.savedDecimals
                    });
                }
            }
        })()
    });
})(jQuery);