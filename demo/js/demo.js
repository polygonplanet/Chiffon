(function() {
  'use strict';

  var EventBus = _.extend({}, Backbone.Events);

  var WindowView = Backbone.View.extend({
    el: window,
    events: {
      'resize': 'onResize'
    },
    onResize: function() {
      EventBus.trigger('resize:window');
    }
  });

  var AppView = Backbone.View.extend({
    el: 'body',
    events: {
      'change #input': 'onInputChange',
      'keyup #input': 'onInputChange',
      'keypress #input': 'onInputChange',
      'paste #input': 'onInputChange',
      'change #input': 'onInputChange',
      'change #range': 'onRangeChange',
      'change #loc': 'onLocChange',
      'click .output-tabs a': 'onTabClick'
    },

    _options: {},
    _timerId: null,
    _method: 'parse',

    initialize: function(attributes, options) {
      _.bindAll.apply(_, [this].concat(_.functions(this)));

      this.$input = this.$el.find('#input');
      this.$output = this.$el.find('#output');
      this.$range = this.$el.find('#range');
      this.$loc = this.$el.find('#loc');
      this.$url = this.$el.find('#url');
      this.$outputTabs = this.$el.find('.output-tabs');

      EventBus.on('resize:window', this.onWindowResize);
      this.onWindowResize();
      this.onRangeChange();
      this.onLocChange();
      this.parseURL();
      this.parse();
      this.$input.focus();
    },

    render: function() {
      return this;
    },

    onInputChange: function(event) {
      this.parse();
    },
    onRangeChange: function(event) {
      this._options.range = this.$range.prop('checked');
      this.parse();
    },
    onLocChange: function(event) {
      this._options.loc = this.$loc.prop('checked');
      this.parse();
    },
    onTabClick: function(event) {
      var method = $(event.currentTarget).data('method');
      this.changeTab(method);
    },
    changeTab: function(method) {
      switch (method) {
        case 'parse':
        case 'tokenize':
          this._method = method;
          this.$outputTabs.find('li').removeClass('active');
          var $a = this.$outputTabs.find('[data-method=' + method + ']');
          $a.parent().addClass('active');
          this.parse();
          break;
      }
    },

    parse: function() {
      if (this._timerId) {
        clearTimeout(this._timerId);
      }
      this._timerId = setTimeout(this._parse, 150);
    },
    _parse: function() {
      var result;
      try {
        result = Chiffon[this._method](this.$input.val(), this._options);
        result = JSON.stringify(result, null, '    ');
      } catch (e) {
        result = e.message || e;
      }

      this.$output.val(result);
      this.updateURL();
      this._timerId = null;
    },

    updateURL: function() {
      var params = {
        code: this.$input.val(),
        method: this._method,
        range: this._options.range,
        loc: this._options.loc
      };
      var href = location.href.replace(/[?#].*$/, '');
      var url = href + '?' + Util.buildParams(params);
      this.$url.val(url);
    },
    parseURL: function() {
      var params = Util.parseParams(location.search.substring(1));
      if (params.range === 'true') {
        this.$range.prop('checked', true);
      }
      if (params.loc === 'true') {
        this.$loc.prop('checked', true);
      }
      if (params.method) {
        this.changeTab(params.method);
      }
      if (params.code) {
        this.$input.val(params.code);
      }
    },

    onWindowResize: function() {
      var height = Math.max(200, $(window).height() - 320);
      this.$input.height(height);
      this.$output.height(height);
    }
  });


  var Util = {
    parseParams: function(query) {
      return query.split('&').reduce(function(params, param) {
        var pairs = param.split('=').map(decodeURIComponent);
        params[pairs[0]] = pairs[1];
        return params;
      }, {});
    },
    buildParams: function(params) {
      return Object.keys(params).reduce(function(items, key) {
        items.push([key, params[key]].map(encodeURIComponent).join('='));
        return items;
      }, []).join('&');
    }
  };


  $(function() {
    new WindowView();
    new AppView();
  });

}());
