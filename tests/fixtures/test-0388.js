#!/usr/bin/env node
const parts = ['usr', 'local', 'bin'];
const path = '/' + parts.join('/');
const depth = path.split('/').length - 1;
