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
    var CHART_TYPES = ['pie', 'bar', 'line', 'barhorizontal', 'echartbar', 'echartline', 'echartpie'
    ,'echart1','echart2','echart3','echart4','echart5','echart6','echart7','echart8','echart9'];


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
            var user_mode = this.state.mode;
            if (user_mode.indexOf('echart')>-1){ //如果是自己定义图表
                //   CHART_TYPES.push(user_mode);
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
                margin: {left: 80, bottom: 100, top: 80, right: 60},
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
        // echart 柱状图
        _renderEchartbarChart: function () {
            var self = this;
            var data = [];
            var values;
            var measure = this.state.fields[this.state.measure].string;
            this.state.data.forEach(self._sanitizeLabel);
            if (this.state.groupedBy.length) {
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
                    current_serie = {
                        data: [],
                        type: 'bar',
                        name: series[i]
                    };
                    for (j = 0; j < xlabels.length; j++) {
                        current_serie.data.push(values[series[i]][xlabels[j]] || 0);
                    }
                    data.push(current_serie);
                }
            }
            if (this.state.groupedBy.length <= 1) {
                data[0].values = _.filter(data[0].values, function (elem, index) {
                    return self.state.data[index].count > 0;
                });
            }
            var $svgContainer = $('<div/>', {class: 'o_graph_svg_container'});
            this.$el.append($svgContainer);
            // 使用刚指定的配置项和数据显示图表。jquery 转dom  $svgContainer[0]
            echarts.init($svgContainer[0]).setOption({
                title: {
                    text: measure,
                    subtext: '',
                    textAlign: 'auto',
                    right: 20
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                legend: {
                    data: series
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'value',
                    boundaryGap: [0, 0.01]
                },
                yAxis: {
                    type: 'category',
                    data: xlabels
                },
                series: data
            });
            return null;
        },
        _renderEchartpieChart: function (stateData) {
            var self = this;
            var data = [];
            var legenddata = [];
            var all_negative = true;
            var some_negative = false;
            var all_zero = true;
            var measure = this.state.fields[this.state.measure].string;
            // undefined label value becomes a string 'Undefined' translated
            stateData.forEach(self._sanitizeLabel);

            stateData.forEach(function (datapt) {
                all_negative = all_negative && (datapt.value < 0);
                some_negative = some_negative || (datapt.value < 0);
                all_zero = all_zero && (datapt.value === 0);
            });
            if (some_negative && !all_negative) {
                this.$el.append(qweb.render('GraphView.error', {
                    title: _t("Invalid data"),
                    description: _t("Pie chart cannot mix positive and negative numbers. " +
                        "Try to change your domain to only display positive results"),
                }));
                return;
            }
            if (all_zero) {
                if (this.isEmbedded || this.isComparison) {
                    // add fake data to display an empty pie chart
                    data = [{
                        name: "No data",
                        value: 1
                    }];
                } else {
                    this.$el.append(qweb.render('GraphView.error', {
                        title: _t("Invalid data"),
                        description: _t("Pie chart cannot display all zero numbers.. " +
                            "Try to change your domain to display positive results"),
                    }));
                    return;
                }
            } else {
                if (this.state.groupedBy.length) {
                    data = stateData.map(function (datapt) {
                        return {name: datapt.labels.join("/"), value: datapt.value};
                    });
                    legenddata = stateData.map(function (datapt) {
                        return {name: datapt.labels.join("/")};
                    });
                }

                // We only keep groups where count > 0
                data = _.filter(data, function (elem, index) {
                    return stateData[index].count > 0;
                });
            }

            var $svgContainer = $('<div/>', {class: 'o_graph_svg_container'});
            this.$el.append($svgContainer);
            echarts.init($svgContainer[0]).setOption({
                title: {
                    text: '',
                    subtext: measure,
                    x: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: "{a} <br/>{b} : {c} ({d}%)"
                },
                legend: {
                    orient: 'vertical',
                    left: 'left',
                    data: legenddata
                },
                series: [
                    {
                        name: measure,
                        type: 'pie',
                        radius: '55%',
                        center: ['50%', '60%'],
                        data: data,
                        itemStyle: {
                            emphasis: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            });
            return null;
        },
        _renderEchartlineChart: function () {
            var self = this;

            // Remove Undefined of first GroupBy
            var graphData = _.filter(this.state.data, function (elem) {
                return elem.labels[0] !== undefined && elem.labels[0] !== _t("Undefined");
            });

            // undefined label value becomes a string 'Undefined' translated
            this.state.data.forEach(self._sanitizeLabel);

            var data = [];
            var ticksLabels = [];
            var measure = this.state.fields[this.state.measure].string;
            var values;

            if (this.state.groupedBy.length) {
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
                    current_serie = {
                        data: [],
                        type: 'line',
                        name: series[i]
                    };
                    for (j = 0; j < xlabels.length; j++) {
                        current_serie.data.push(values[series[i]][xlabels[j]] || 0);
                    }
                    data.push(current_serie);
                }
            }

            var $svgContainer = $('<div/>', {class: 'o_graph_svg_container'});
            this.$el.append($svgContainer);
            echarts.init($svgContainer[0]).setOption({
                title: {
                    text: measure
                },
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    data: series
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                toolbox: {
                    feature: {
                        saveAsImage: {}
                    }
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data:xlabels
                },
                yAxis: {
                    type: 'value'
                },
                series:  data
            });
            return null;
        },


    });
});
