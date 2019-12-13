# -*- coding: utf-8 -*-
from odoo import http
import os
import logging
from lxml import etree
from odoo.loglevels import ustr

from odoo.tools import misc, view_validation

_logger = logging.getLogger(__name__)


class Webreport(http.Controller):

    @http.route('/webreport/schema_graph', type='http', auth='user', website=True,  methods=['GET', 'POST'])
    def schema_graph(self, **kwargs):
        data = None
        try:
            with misc.file_open(os.path.join('web_reportchart', 'views', 'graph_view_echart.rng')) as f:
                data = f.read()
                _logger.info('新文件%s' % data.encode("utf-8"))

            with misc.file_open(os.path.join('base', 'rng', 'graph_view.rng'), 'wb') as f:
                f.write(data.encode("utf-8"))

            with misc.file_open(os.path.join('base', 'rng', 'graph_view.rng')) as f:
                data = f.read()
                _logger.info('写过后的文件%s' % data.encode("utf-8"))
        except Exception as e:
            _logger.error(e)
            return "'graph_view.rng文件更新失败：%s" % e

        return "'graph_view.rng文件已更新"
