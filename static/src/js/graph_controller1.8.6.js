odoo.define('web.GraphController1.8.6', function (require) {

    var core = require('web.core');
    var AbstractController = require('web.AbstractController');
    var GroupByMenuInterfaceMixin = require('web.GroupByMenuInterfaceMixin');

    var qweb = core.qweb;


    var GraphController = require('web.GraphController');
    GraphController.include({

        renderButtons: function ($node) {
            if ($node) {
                var echart = _.isUndefined(this.renderer.arch.attrs.echart)?'false':this.renderer.arch.attrs.echart;
                var type =  _.isUndefined(this.renderer.arch.attrs.type)?'':this.renderer.arch.attrs.type
                var context = {
                    measures: _.sortBy(_.pairs(_.omit(this.measures, '__count__')), function (x) {
                        return x[1].string.toLowerCase();
                    }),
                    echart: echart.toLowerCase(),
                    type:type.toLowerCase()
                };
                this.$buttons = $(qweb.render('GraphView.buttons', context));
                this.$measureList = this.$buttons.find('.o_graph_measures_list');
                this.$buttons.find('button').tooltip();
                this.$buttons.click(this._onButtonClick.bind(this));
                this._updateButtons();
                this.$buttons.appendTo($node);
                if (this.isEmbedded) {
                    this._addGroupByMenu($node, this.groupableFields);
                }
            }
        },

    });
});