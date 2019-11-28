# -*- coding: utf-8 -*-
from odoo import http
import os
import logging
from lxml import etree
from odoo.loglevels import ustr

from odoo.tools import misc, view_validation

_logger = logging.getLogger(__name__)


class Webreport(http.Controller):
    @http.route('/webreport/schema_graph', type='http', auth='user')
    def schema_graph(self):
        data = None
        with misc.file_open(os.path.join('web_reportchart', 'views', 'graph_view_echart.rng')) as f:
            data = f.read()
        try:
            with misc.file_open(os.path.join('base', 'rng', 'graph_view.rng'), 'wb') as f:
                f.write(data.encode("utf-8"))
        except Exception as e:
            _logger.error(e)
        with misc.file_open(os.path.join('base', 'rng', 'graph_view.rng')) as f:
            data = f.read()
        return "'graph_view.rng文件已更新"
