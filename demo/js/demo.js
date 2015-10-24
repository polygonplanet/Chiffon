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
      'change #loc': 'onLocChange'
    },

    _options: {},
    _timerId: null,

    initialize: function(attributes, options) {
      _.bindAll.apply(_, [this].concat(_.functions(this)));

      this.$input = this.$el.find('#input');
      this.$output = this.$el.find('#output');
      this.$range = this.$el.find('#range');
      this.$loc = this.$el.find('#loc');
      this.$url = this.$el.find('#url');

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

    parse: function() {
      if (this._timerId) {
        clearTimeout(this._timerId);
      }
      this._timerId = setTimeout(this._parse, 150);
    },
    _parse: function() {
      var tokens = Chiffon.tokenize(this.$input.val(), this._options);
      this.$output.val(JSON.stringify(tokens, null, '    '));
      this.updateURL();
      this._timerId = null;
    },

    updateURL: function() {
      var params = {
        code: this.$input.val(),
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
