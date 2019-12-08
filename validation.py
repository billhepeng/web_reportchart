# -*- coding: utf-8 -*-
import logging
import os

from lxml import etree

from odoo.loglevels import ustr
from odoo.tools import misc, view_validation

_logger = logging.getLogger(__name__)

_relaxng_cache = {}

_graph_validator = None


@view_validation.validate('graph')
def schema_graph(arch):
    """ Check the graph view against its schema

    :type arch: etree._Element
    """
    global _graph_validator

    if _graph_validator is None:
        with misc.file_open(os.path.join('base', 'rng', 'graph_view_echart.rng')) as f:
            _graph_validator = etree.RelaxNG(etree.parse(f))

    if _graph_validator.validate(arch):
        return True

    for error in _graph_validator.error_log:
        _logger.error(ustr(error))
    return False
