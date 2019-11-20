odoo.define('web.GraphRenderer_1.8.6', function (require) {
    'use strict';
    var ajax = require('web.ajax');
    var core = require('web.core');
    var Widget = require('web.Widget');
    var field_utils = require('web.field_utils');
    var config = require('web.config');
    //var data = require('web.data');
    var qweb = core.qweb;
    var _t = core._t;

    var MAX_LEGEND_LENGTH = 25 * (Math.max(1, config.device.size_class));
    var SPLIT_THRESHOLD = config.device.isMobile ? Infinity : 20;
    var CHART_TYPES = ['pie', 'bar', 'line', 'barhorizontal'];


    var GraphRenderer = require('web.GraphRenderer');
    GraphRenderer.include({
        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Render the chart.
         *
         * Note that This method is synchronous, but the actual rendering is done
         * asynchronously.  The reason for that is that nvd3/d3 needs to be in the
         * DOM to correctly render itself.  So, we trick Odoo by returning
         * immediately, then we render the chart when the widget is in the DOM.
         *
         * @override
         * @private
         * @returns {Deferred} The _super deferred is actually resolved immediately
         */
        _render: function () {
            if (this.to_remove) {
                nv.utils.offWindowResize(this.to_remove);
            }
            if (!_.contains(CHART_TYPES, this.state.mode)) {
                this.$el.empty();
                this.trigger_up('warning', {
                    title: _t('Invalid mode for chart'),
                    message: _t('Cannot render chart with mode : ') + this.state.mode
                });
            } else if (!this.state.data.length && this.state.mode !== 'pie') {
                this.$el.empty();
                this.$el.append(qweb.render('GraphView.error', {
                    title: _t("No data to display"),
                    description: _t("Try to add some records, or make sure that " +
                        "there is no active filter in the search bar."),
                }));
            } else if (this.isInDOM) {
                // only render the graph if the widget is already in the DOM (this
                // happens typically after an update), otherwise, it will be
                // rendered when the widget will be attached to the DOM (see
                // 'on_attach_callback')
                this._renderGraph();
            }
            return $.when();
        },
        _renderBarhorizontalChart: function () {
            // prepare data for bar chart
            var self = this;
            var data = [];
            var values;
            var measure = this.state.fields[this.state.measure].string;


            // undefined label value becomes a string 'Undefined' translated
            this.state.data.forEach(self._sanitizeLabel);

            if (this.state.groupedBy.length === 0) {
                data = [{
                    values: [{
                        x: measure,
                        y: this.state.data[0].value
                    }],
                    key: measure
                }];
            } else if (this.state.groupedBy.length === 1) {
                values = this.state.data.map(function (datapt, index) {
                    return {x: datapt.labels, y: datapt.value};
                });
                data.push({
                    values: values,
                    key: measure,
                });
                if (this.state.comparisonData) {
                    values = this.state.comparisonData.map(function (datapt, index) {
                        return {x: datapt.labels, y: datapt.value};
                    });
                    data.push({
                        values: values,
                        key: measure + ' (compare)',
                        color: '#ff7f0e',
                    });
                }
            } else if (this.state.groupedBy.length > 1) {
                var xlabels = [],
                    series = [],
                    label, serie, value;
                values = {};
                for (var i = 0; i < this.state.data.length; i++) {
                    label = this.state.data[i].labels[0];
                    serie = this.state.data[i].labels[1];
                    value = this.state.data[i].value;
                    if ((!xlabels.length) || (xlabels[xlabels.length - 1] !== label)) {
                        xlabels.push(label);
                    }
                    series.push(this.state.data[i].labels[1]);
                    if (!(serie in values)) {
                        values[serie] = {};
                    }
                    values[serie][label] = this.state.data[i].value;
                }
                series = _.uniq(series);
                data = [];
                var current_serie, j;
                for (i = 0; i < series.length; i++) {
                    current_serie = {values: [], key: series[i]};
                    for (j = 0; j < xlabels.length; j++) {
                        current_serie.values.push({
                            x: xlabels[j],
                            y: values[series[i]][xlabels[j]] || 0,
                        });
                    }
                    data.push(current_serie);
                }
            }

            // For one level Bar chart View, we keep only groups where count > 0
            if (this.state.groupedBy.length <= 1) {
                data[0].values = _.filter(data[0].values, function (elem, index) {
                    return self.state.data[index].count > 0;
                });
            }

            var $svgContainer = $('<div/>', {class: 'o_graph_svg_container'});
            this.$el.append($svgContainer);
            var svg = d3.select($svgContainer[0]).append('svg');
            svg.datum(data);

            svg.transition().duration(0);

            var chart = nv.models.multiBarHorizontalChart();
            chart.options({
                margin: {left: 80, bottom: 100, top: 80, right: 0},
                delay: 100,
                transition: 10,
                controlLabels: {
                    'grouped': _t('Grouped'),
                    'stacked': _t('Stacked'),
                },
                showLegend: _.size(data) <= MAX_LEGEND_LENGTH,
                showXAxis: true,
                showYAxis: true,
                rightAlignYAxis: false,
                stacked: this.stacked,
                reduceXTicks: false,
                rotateLabels: -20,
                showControls: (this.state.groupedBy.length > 1)
            });
            chart.yAxis.tickFormat(function (d) {
                var measure_field = self.state.fields[self.measure];
                return field_utils.format.float(d, {
                    digits: measure_field && measure_field.digits || [69, 2],
                });
            });

            chart(svg);
            return chart;
        },


    });
});
