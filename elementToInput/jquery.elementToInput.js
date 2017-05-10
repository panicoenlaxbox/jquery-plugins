/*
 * jQuery Plugin 
 * Copyright 2015, Sergio León
 * http://panicoenlaxbox.blogspot.com/
 */
(function ($) {
    "use strict";

    var pluginName = "elementToInput";

    var DECIMAL_SEPARATOR = Globalize.culture().numberFormat["."];
    var THOUSAND_SEPARATOR = Globalize.culture().numberFormat[","];

    function getNextElement($el, next) {
        var data = $el.data(pluginName);
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

    function isNumericType(type) {
        return isIntegerType(type) || isDecimalType(type);
    }

    function isIntegerType(type) {
        return type === "int";
    }

    function isDecimalType(type) {
        return ["decimal", "percentage", "currency"].indexOf(type) !== -1;
    }

    function removeThousandSeparator(value) {
        if (value === null) {
            return value;
        }
        var regex = new RegExp("\\" + THOUSAND_SEPARATOR, "g");
        return value.replace(regex, "");
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
        if (value === null) {
            return value;
        }
        while (value.substr(value.length - 1, 1) === "0") {
            value = value.substring(0, value.length - 1);
        }
        if (value.substr(value.length - 1, 1) === DECIMAL_SEPARATOR) {
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
                format = "n0";
                break;
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
        $input.addClass("element_to_input");
        var data = $el.data(pluginName);
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

    function setValue($el, key, value, options) {
        var data = $el.data(pluginName);
        options = options || {};
        if (options.previousKey) {
            data[options.previousKey] = data[key];
        }
        data[key] = value;
        if (options.attrKey) {
            $el.attr("data-" + options.attrKey, value);
        }
    }

    function getNumberOfThousandSeparator(value) {
        var pattern = "\\" + THOUSAND_SEPARATOR;
        var regex = new RegExp(pattern, "g");
        return (value.match(regex) || []).length;
    }

    function validate(text, options) {
        text = $.trim(text);
        if (text === "" && options.required) {
            return false;
        }
        if (text && isNumericType(options.type)) {
            var value = parseText(text, options.type);
            if (isNaN(value)) {
                return false;
            }
            if (!options.allowNegative && value < 0) {
                return false;
            }
            if (typeof options.min === "number") {
                if (value < options.min) {
                    return false;
                }
            }
            if (typeof options.max === "number") {
                if (value > options.max) {
                    return false;
                }
            }
        }
        return true;
    }

    function editing($el, active, selector) {
        if (active) {
            $el.addClass("editing");
        } else {
            $el.removeClass("editing");
        }
        if (selector) {
            var $parent = $el.closest(selector);
            if (active) {
                $parent.addClass("editing");
            } else {
                $parent.removeClass("editing");
            }
        }
    }

    function invalid($el, active, selector) {
        if (active) {
            $el.addClass("invalid");
        } else {
            $el.removeClass("invalid");
        }
        if (selector) {
            var $parent = $el.closest(selector);
            if (active) {
                $parent.addClass("invalid");
            } else {
                $parent.removeClass("invalid");
            }
        }
    }

    function getNumericValues(textToParse, options) {
        // text has to be a value that can be parsed with globalize
        if (textToParse === "") {
            return {
                value: null, // typed value
                bindingValue: "", // value ready for binding, aware of culture
                text: "" // formatted value, aware of culture
            }
        }
        var value = parseText(textToParse, options.type);
        var bindingValue;
        var tempValue;
        if (options.type === "percentage") {
            value /= 100;
            bindingValue = formatValue(value, "decimal", options.savedDecimals + 2, true);
            tempValue = parseFloat(value.toFixed(options.displayedDecimals + 2));
        } else {
            bindingValue = formatValue(value, isDecimalType(options.type) ? "decimal" : "int", options.savedDecimals, true);
            tempValue = isDecimalType(options.type) ? parseFloat(value.toFixed(options.displayedDecimals)) : value;
        }
        var text = formatValue(tempValue, options.type, options.displayedDecimals, false);
        return {
            value: value,
            bindingValue: bindingValue,
            text: text
        }
    }

    function click() {
        var $input = $(this);
        var $parent = $input;
        var data = $parent.data(pluginName);
        var text = data.text;
        if (data.isValid) {
            // edit with format
            if (data.type === "percentage") {
                text = formatValue(data.value ? data.value * 100 : 0, "decimal", data.savedDecimals, false);
            } else if (isNumericType(data.type)) {
                text = formatValue(data.value, isDecimalType(data.type) ? "decimal" : "int", data.savedDecimals, false);
            }
        }
        var $input = createInput($parent, text);
        $input.on(event("click"), function (e) {
            editing($parent, true, data.closestSelector);
            e.stopPropagation();
        });
        $input.on(event("keydown"), keydown);
        $input.on(event("keyup"), keyup);
        $input.on(event("blur"), blur);
        $parent.empty();
        $parent.append($input);
        $input.select();
        editing($parent, true, data.closestSelector);
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
        var $parent = $input.parent();
        var data = $parent.data(pluginName);
        if (data.readonly && !(isEsc || isTab || isEnter || isArrow)) {
            e.preventDefault();
            return;
        }
        if (isEsc || isTab || isEnter || isUpArrow || isDownArrow) {
            e.preventDefault();
            if (isEsc) {
                setValue($parent, "esc", true);
            }
            $input.blur();
            if (isEsc) {
                return;
            }
            if (!data.moveToNextElement) {
                return;
            }
            var next = true;
            if ((isTab && isShift) || isUpArrow) {
                next = false;
            }
            var nextElement = getNextElement($parent, next);
            if (nextElement) {
                $(nextElement).click();
            }
        }
        if (isNumericType(data.type)) {
            var isNumpadComma = e.keyCode === 110;
            if (isNumpadComma) {
                e.preventDefault();
                insertTextAtCaretPosition($input[0], DECIMAL_SEPARATOR);
            }
        }
    }

    function keyup() {
        var $input = $(this);
        var data = $input.parent().data(pluginName);
        var currentValue = $input.val();
        if (
            data.readonly ||
            !data.editFormatted ||
            !isNumericType(data.type) ||
            $.trim(currentValue) === "") {
            return;
        }
        var lastCharacter = (currentValue.substring(currentValue.length - 1));
        if (lastCharacter === DECIMAL_SEPARATOR || lastCharacter === "0") {
            return;
        }
        var value = parseText(currentValue, data.type);
        if (isNaN(value)) {
            return;
        }
        var caretPosition = getStartCaretPosition($input[0]);
        var currentNumberOfThousandSeparator = getNumberOfThousandSeparator(currentValue);
        var newValue = formatValue(value, isDecimalType(data.type) ? "decimal" : "int", data.savedDecimals, false);
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

    function getStartCaretPosition(input) {
        return input.selectionStart;
    }

    function getEndCaretPosition(input) {
        return input.selectionEnd;
    }

    function setCaretPosition(input, position) {
        if (typeof position === "string") {
            position = $(input).val().indexOf(position) + position.length;
        }
        input.focus();
        input.setSelectionRange(position, position);
    }

    function insertTextAtCaretPosition(input, text) {
        var start = getStartCaretPosition(input);
        var end = getEndCaretPosition(input);
        var $input = $(input);
        var currentText = $input.val();
        var newText = currentText.substring(0, start);
        newText += text;
        newText += currentText.substring(end, currentText.length);
        $input.val(newText);
        setCaretPosition(input, text);
    }

    function blur() {
        var $input = $(this);
        var $parent = $input.parent();
        var data = $parent.data(pluginName);
        var cancel = data.readonly || data.esc;
        if (cancel) {
            editing($parent, false, data.closestSelector);
            invalid($parent, !data.isValid, data.closestSelector);
            $input.remove();
            $parent.text(data.previousText);
            delete data.esc;
            return;
        }
        $input.remove();
        var eventData = changeText($parent, $.trim($input.val()));
        var onChangedReturnValue = true;
        if (eventData.hasChanged) {
            onChangedReturnValue = (data.events.onChanged || $.noop)($parent, eventData);
        }
        setValue($parent, "moveToNextElement", onChangedReturnValue === false ? false : true);
        delete data.esc;
    }

    function changeText($parent, text) {
        var data = $parent.data(pluginName);
        var value;
        var bindingValue;
        var isValid = validate(text, {
            type: data.type,
            min: data.min,
            max: data.max,
            allowNegative: data.allowNegative,
            required: data.required
        });
        setValue($parent, "isValid", isValid, {
            attrKey: "is-valid"
        });
        if (isValid) {
            if (isNumericType(data.type)) {
                var numericValues = getNumericValues(text, {
                    type: data.type,
                    displayedDecimals: data.displayedDecimals,
                    savedDecimals: data.savedDecimals
                });
                value = numericValues.value;
                bindingValue = numericValues.bindingValue;
                text = numericValues.text;
            } else {
                value = bindingValue = text;
            }
        } else {
            value = null;
            bindingValue = "";
        }
        setValue($parent, "value", value, {
            attrKey: "value",
            previousKey: "previousValue"
        });
        setValue($parent, "bindingValue", bindingValue, {
            attrKey: "binding-value",
            previousKey: "previousBindingValue"
        });
        setValue($parent, "text", text, {
            previousKey: "previousText"
        });
        var isDirty = data.previousText !== text;
        setValue($parent, "isDirty", isDirty, {
            attrKey: "is-dirty"
        });
        editing($parent, false, data.closestSelector);
        invalid($parent, !data.isValid, data.closestSelector);
        $parent.text(text);
        var result = {
            originalValue: data.originalValue,
            originalBindingValue: data.originalBindingValue,
            originalText: data.originalText,
            hasChangedOriginal: data.originalText !== data.text,
            previousValue: data.previousValue,
            previousBindingValue: data.previousBindingValue,
            previousText: data.previousText,
            value: data.value,
            bindingValue: data.bindingValue,
            text: data.text,
            hasValue: !!data.text,
            isValid: data.isValid,
            hasChanged: data.previousText !== data.text,
            isDirty: data.isDirty
        };
        return result;
    }

    function initialize($el) {
        var data = $el.data(pluginName);
        if (!("bindingValue" in data) || data.bindingValue === undefined) {
            data.bindingValue = "";
        } else {
            data.bindingValue = data.bindingValue.toString();
        }
        setValue($el, "isDirty", false, {
            attrKey: "is-dirty"
        });
        var isValid = validate(data.bindingValue, {
            type: data.type,
            min: data.min,
            max: data.max,
            allowNegative: data.allowNegative,
            required: data.required
        });
        setValue($el, "isValid", isValid, {
            attrKey: "is-valid"
        });
        invalid($el, !data.isValid, data.closestSelector);
        if (!data.isValid) {
            $el.removeAttr("data-binding-value");
            data.originalValue = null;
            data.originalBindingValue = null;
            data.originalText = data.bindingValue;
            data.previousValue = null;
            data.previousBindingValue = null;
            data.previousText = data.bindingValue;
            data.value = null;
            data.bindingValue = "";
            data.text = data.originalText;
        } else {
            $el.attr("data-binding-value", data.bindingValue);
            var value = null;
            if (data.bindingValue !== "") {
                if (isNumericType(data.type)) {
                    value = parseText(data.bindingValue, data.type);
                } else {
                    value = data.bindingValue;
                }
                $el.attr("data-value", value.toString().replace(DECIMAL_SEPARATOR, "."));
            }
            data.value = value;
            var text = "";
            if (value !== null) {
                text = formatValue(data.value, data.type, data.displayedDecimals, false);
            }
            data.text = text;
            data.originalValue = data.value;
            data.originalBindingValue = data.bindingValue;
            data.originalText = data.text;
            data.previousValue = data.value;
            data.previousBindingValue = data.bindingValue;
            data.previousText = data.text;
        }
        $el.text(data.text);
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
                    if (!("bindingValue" in data) || data.bindingValue === undefined) {
                        data.bindingValue = "";
                    } else {
                        data.bindingValue = data.bindingValue.toString();
                    }
                    $this.data(pluginName, data);
                    initialize($this);
                    $this.on(event("click"), click);
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
                setBindingValue: function ($parent, bindingValue) {
                    changeText($parent, bindingValue);
                },
                setDirty: function ($parent, isDirty) {
                    setValue($parent, "isDirty", isDirty, {
                        attrKey: "is-dirty"
                    });
                },
                getValues: function ($el) {
                    if ($el[0].tagName.toUpperCase() === "INPUT") {
                        $el = $input.parent();
                    }
                    var data = $el.data(pluginName);
                    return {
                        value: data.value,
                        bindingValue: data.bindingValue,
                        text: data.text
                    }
                }
            }
        })()
    });
})(jQuery);