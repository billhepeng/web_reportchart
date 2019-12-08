# -*- coding: utf-8 -*-
{
    'name': "web reportchart",

    'summary': """
        报表
        """,

    'description': """
        报表增强 
    """,
    'author': "hepeng",
    'website': "",
    'category': 'Uncategorized',
    'version': '0.1',
    'depends': ['base', 'web'],
    'data': [
        # 'security/ir.model.access.csv',
        'views/templates.xml',
    ],
    # only loaded in demonstration mode
    'demo': [
        'demo/demo.xml',
    ],
    'qweb': [
        "static/src/xml/base.xml"
    ],
}
