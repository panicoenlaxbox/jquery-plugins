  // http://stackoverflow.com/a/36711150
  function parseDataSet(dataSet) {
      var data = {};
      for (var i = 0; i < Object.keys(dataSet).length; i++) {
          var key = Object.keys(dataSet)[i];
          data = parseDataSetKey(key.split('-'), dataSet[key], data);
      }
      return data;
  }

  function parseDataSetKey(keys, value, data) {
      data = data || {};
      var key = _.camelCase(keys[0]);

      if (!data[key]) {
          data[key] = {};
      }

      if (keys.length > 1) {
          keys.splice(0, 1);
          data[key] = parseDataSetKey(keys, value, data[key]);
      } else {
          data[key] = value;
      }

      return data;
  }

  function removeDataSet(el) {
      var attributes = $.map(el.attributes, function (item) {
          if (item.name.indexOf("data-") == 0) {
              return item.name;
          }
      });
      var $el = $(el);
      $.each(attributes, function (index, element) {
          $el.removeAttr(element);
      });
  }

  function restoreDataSet(el, dataSet) {
      removeDataSet(el);
      _restoreDataSet(el, dataSet, "data-")
  }

  function _restoreDataSet(el, dataSet, prefix) {
      var $el = $(el);
      var keys = Object.keys(dataSet);
      for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var value = dataSet[key];
          if (typeof value === "object") {
              _restoreDataSet(el, value, (prefix || "") + key + "--")
          } else {
              $el.attr((prefix || "") + key.toLowerCase(), value);
          }
      }
  }