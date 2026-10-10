(function () {
  const BRIDGE_VERSION = '1.2.0';
  if (window.__JOB_AUTOFILL_PAGE_BRIDGE_HANDLER__) {
    document.removeEventListener('job-autofill-select-request', window.__JOB_AUTOFILL_PAGE_BRIDGE_HANDLER__);
  }
  window.__JOB_AUTOFILL_PAGE_BRIDGE__ = BRIDGE_VERSION;

  const normalize = text => String(text || '').toLowerCase().replace(/[\s：:＊*()（）_\-\/]/g, '');
  const visible = el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };

  const bridgeHandler = event => {
    const request = event.target;
    const id = request?.dataset?.requestId || '';
    const value = request?.dataset?.value || '';
    const mode = request?.dataset?.mode || 'select';
    const controlId = request?.dataset?.controlId || '';
    const target = normalize(value);
    const control = controlId ? document.querySelector(`[data-job-autofill-control="${CSS.escape(controlId)}"]`) : null;
    const selectRoot = control?.closest('.el-select');
    const selectVm = selectRoot?.__vue__;
    if (request?.dataset) {
      request.dataset.bridgeLoaded = '1';
      request.dataset.controlFound = control ? '1' : '0';
      request.dataset.selectRootFound = selectRoot ? '1' : '0';
      request.dataset.vueFound = selectVm ? '1' : '0';
      request.dataset.optionsCount = Array.isArray(selectVm?.options) ? String(selectVm.options.length) : '-1';
      request.dataset.hasHandleOptionClick = typeof selectVm?.handleOptionClick === 'function' ? '1' : '0';
    }
    let pickedText = '';
    let ok = false;

    if (selectVm && Array.isArray(selectVm.options) && typeof selectVm.handleOptionClick === 'function') {
      const scoredVms = selectVm.options.map(optionVm => {
        const label = String(optionVm.currentLabel ?? optionVm.label ?? optionVm.value ?? '');
        const text = normalize(label);
        let score = 0;
        if (text === target) score = 3;
        else if (text && target.includes(text)) score = 2;
        else if (target && text.includes(target)) score = 1;
        return { optionVm, label, score };
      }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
      if (scoredVms[0]) {
        selectVm.handleOptionClick(scoredVms[0].optionVm, true);
        pickedText = scoredVms[0].label;
        ok = true;
      }
    }

    let options = Array.from(document.querySelectorAll([
      '.el-select-dropdown__item:not(.is-disabled)',
      '.el-cascader-node:not(.is-disabled)',
      '.el-cascader-node__label',
      '[role="option"]:not([aria-disabled="true"])'
    ].join(','))).filter(visible);
    if (mode === 'region') {
      options = Array.from(document.querySelectorAll('button, li, a, div, span'))
        .filter(visible)
        .filter(node => {
          const text = (node.innerText || node.textContent || '').trim();
          if (!text || text.length > 12) return false;
          const normalized = normalize(text).replace(/[省市区县]$/g, '');
          const wanted = target.replace(/[省市区县]$/g, '');
          return normalized === wanted;
        })
        .sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return ar.width * ar.height - br.width * br.height;
        });
    }

    const scored = options.map(option => {
      const text = normalize(option.innerText || option.textContent);
      let score = 0;
      if (text === target) score = 3;
      else if (text && target.includes(text)) score = 2;
      else if (target && text.includes(target)) score = 1;
      return { option, text, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    const picked = scored[0]?.option;
    if (!ok && picked) {
      const clickable = picked.closest('.el-select-dropdown__item, .el-cascader-node') || picked;
      const vm = clickable.__vue__ || picked.__vue__;
      if (vm && typeof vm.selectOptionClick === 'function') {
        vm.selectOptionClick();
        ok = true;
      } else if (vm && typeof vm.handleExpand === 'function') {
        vm.handleExpand();
        ok = true;
      } else {
        clickable.click();
        ok = true;
      }
      pickedText = (picked.innerText || picked.textContent || '').trim();
    }

    if (request?.dataset) {
      request.dataset.ok = ok ? '1' : '0';
      request.dataset.selectedText = pickedText;
      request.dispatchEvent(new Event('job-autofill-select-response', { bubbles: false }));
    }
  };
  window.__JOB_AUTOFILL_PAGE_BRIDGE_HANDLER__ = bridgeHandler;
  document.addEventListener('job-autofill-select-request', bridgeHandler);
})();
