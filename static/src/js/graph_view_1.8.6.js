odoo.define('web.GraphView_1.8.6', function (require) {
    'use strict';
    var ajax = require('web.ajax');
    var core = require('web.core');
    var Widget = require('web.Widget');
    var qweb = core.qweb;
    var _t = core._t;
    var GraphView = require('web.GraphView');


    GraphView.include({
        jsLibs: [
            '/web/static/lib/nvd3/d3.v3.js',
            '/web_reportchart/static/libs/nvd3/nv.d3.js',
            '/web/static/src/js/lib/nvd3.js'
        ],
        init: function (parent, options) {
            this._super.apply(this, arguments);
        },
        willStart: function () {
            var self = this;
            return $.when(this._super.apply(this, arguments));
        },
        start: function () {
            var self = this;
            return this._super.apply(this, arguments);
        },


    });
});
