(function () {
  const CONTENT_VERSION = '1.2.0';
  if (window.__JOB_AUTOFILL_MESSAGE_LISTENER__) {
    try { chrome.runtime.onMessage.removeListener(window.__JOB_AUTOFILL_MESSAGE_LISTENER__); } catch (_) {}
  }
  window.__JOB_AUTOFILL_CONTENT_READY__ = CONTENT_VERSION;
  const R = window.JobAutofillRules;
  const bridgeDebug = [];

  function searchableRoots() {
    const roots = [document];
    for (let i = 0; i < roots.length; i++) {
      const root = roots[i];
      for (const node of root.querySelectorAll('*')) {
        if (node.shadowRoot && !roots.includes(node.shadowRoot)) roots.push(node.shadowRoot);
      }
    }
    return roots;
  }

  function candidates() {
    const selector = [
      'input', 'textarea', 'select',
      '[contenteditable="true"]', '[role="textbox"]', '[role="combobox"]',
      '.ant-select-selection', '.ant-cascader-picker'
    ].join(',');
    const found = searchableRoots().flatMap(root => Array.from(root.querySelectorAll(selector)));
    return [...new Set(found)]
      .filter(el => !el.disabled && visible(el))
      .filter(el => {
        const role = el.getAttribute('role');
        if (role === 'textbox' && el.querySelector('input, textarea')) return false;
        if (role === 'combobox' && el.querySelector('input, textarea') && !el.matches('.ant-select-selection, .ant-cascader-picker')) return false;
        return true;
      })
      .filter(el => !['hidden', 'submit', 'button', 'file', 'password'].includes((el.type || '').toLowerCase()));
  }

  function visible(el) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  }

  function ownText(el) {
    return [...new Set([
      el.getAttribute('aria-label'), el.getAttribute('data-placeholder'),
      el.getAttribute('data-label'), el.getAttribute('title'),
      el.placeholder, el.name, el.id
    ].filter(Boolean).map(x => String(x).trim()).filter(Boolean))].join(' | ').slice(0, 220);
  }

  function applyEducationLevel(match, educationLevel, label) {
    if (!match || !match.path.startsWith('education.master.')) return match;
    let level = educationLevel || 'auto';
    if (level === 'auto') {
      const text = R.normalize(label);
      if (/硕士|研究生/.test(text)) level = 'master';
      else if (/本科|学士/.test(text)) level = 'bachelor';
      else if (/高中|中学/.test(text)) level = 'highSchool';
      else level = 'master';
    }
    return { ...match, path: match.path.replace('education.master.', `education.${level}.`) };
  }

  function phoenixFieldLabel(el) {
    const item = el.closest('.form-item.form-item--phoenix, .form-item');
    return (item?.querySelector('.form-item__title .form-item__text, label.form-item__text')?.innerText || '').trim();
  }

  function zhiyeStructuredMatch(el, educationLevel) {
    if (!/\.zhiye\.com$/i.test(location.host)) return null;
    const fieldLabel = phoenixFieldLabel(el);
    if (!fieldLabel) return null;
    const body = el.closest('.form-part-body');
    const bodyText = body?.innerText || '';

    if (body && /(学校名称|毕业学校)/.test(bodyText) && /(专业名称|所学专业)/.test(bodyText) && /学历/.test(bodyText)) {
      let level = educationLevel || 'auto';
      if (level === 'auto') {
        if (/硕士|研究生/.test(bodyText)) level = 'master';
        else if (/本科|学士/.test(bodyText)) level = 'bachelor';
        else if (/高中|中学/.test(bodyText)) level = 'highSchool';
        else {
          const educationBodies = Array.from(document.querySelectorAll('.form-part-body'))
            .filter(node => /(学校名称|毕业学校)/.test(node.innerText || '') && /(专业名称|所学专业)/.test(node.innerText || '') && /学历/.test(node.innerText || ''));
          const educationIndex = educationBodies.indexOf(body);
          level = ['master', 'bachelor', 'highSchool'][educationIndex] || 'master';
        }
      }
      const suffixes = {
        '学校名称': 'school', '毕业学校': 'school', '专业名称': 'major', '所学专业': 'major',
        '学历': 'degree', '学位': 'academicDegree', '学习方式': 'educationType',
        '入学时间': 'startDate', '毕业时间': 'endDate', '研究方向': 'researchDirection',
        '院系': 'college', '专业课程': 'courses',
        '平均绩点/平均分': 'gpaScore', '满绩点/总分': 'gpaScale',
        '专业成绩排名前%': 'rankPercent'
      };
      const suffix = suffixes[fieldLabel];
      if (suffix) return { path: `education.${level}.${suffix}`, confidence: 1, alias: fieldLabel };
    }

    if (body && /项目名称/.test(bodyText) && /项目描述/.test(bodyText)) {
      const projectBodies = Array.from(document.querySelectorAll('.form-part-body'))
        .filter(node => /项目名称/.test(node.innerText || '') && /项目描述/.test(node.innerText || ''));
      const projectIndex = projectBodies.indexOf(body);
      const suffixes = {
        '项目名称': 'name', '职务': 'role', '开始时间': 'startDate',
        '结束时间': 'endDate', '项目描述': 'description',
        '项目级别': 'level', '项目内容简述': 'summary50',
        '个人职责': 'responsibility', '项目成果': 'achievement'
      };
      const suffix = suffixes[fieldLabel];
      if (projectIndex >= 0 && suffix) {
        return { path: `projects.${projectIndex}.${suffix}`, confidence: 1, alias: fieldLabel };
      }
    }

    if (body && /单位名称/.test(bodyText) && /主要职责/.test(bodyText)) {
      const paths = {
        '单位名称': 'experience.company', '工作单位': 'experience.company',
        '职位': 'experience.position', '职务': 'experience.position',
        '起始时间': 'experience.startDate', '终止时间': 'experience.endDate',
        '入职时间': 'experience.startDate', '离职时间': 'experience.endDate',
        '主要职责': 'experience.description200', '工作描述': 'experience.description200',
        '取得业绩': 'experience.achievement'
      };
      if (paths[fieldLabel]) return { path: paths[fieldLabel], confidence: 1, alias: fieldLabel };
    }

    if (body && /奖项名称/.test(bodyText) && /获奖原因/.test(bodyText)) {
      const awardBodies = Array.from(document.querySelectorAll('.form-part-body'))
        .filter(node => /奖项名称/.test(node.innerText || '') && /获奖原因/.test(node.innerText || ''));
      const awardIndex = awardBodies.indexOf(body);
      const suffixes = {
        '获得时间': 'date', '颁发组织': 'organization',
        '奖项名称': 'name', '获奖原因': 'reason'
      };
      const suffix = suffixes[fieldLabel];
      if (awardIndex >= 0 && suffix) {
        return { path: `awardDetails.${awardIndex}.${suffix}`, confidence: 1, alias: fieldLabel };
      }
    }

    return null;
  }

  function cmbStructuredMatch(el, fullLabel = '') {
    if (location.host !== 'career.cmbchina.com') return null;
    const id = String(el.id || '');

    // Family-member cards use their own profile namespace. They must never
    // inherit the applicant's name, phone, employer or position.
    const family = id.match(/^resume_familyList_(\d+)_(.+)$/i);
    if (family) {
      const suffixes = {
        relation: 'relation', relationship: 'relation', memberRelation: 'relation',
        name: 'name', memberName: 'name',
        company: 'company', companyName: 'company', employer: 'company', workUnit: 'company',
        position: 'position', job: 'position', jobTitle: 'position', duty: 'position',
        mobile: 'phone', phone: 'phone', phoneNumber: 'phone', contactPhone: 'phone',
        birthday: 'birthDate', birthDate: 'birthDate', dateOfBirth: 'birthDate'
      };
      const suffix = suffixes[family[2]];
      return suffix
        ? { path: `familyMembers.${Number(family[1])}.${suffix}`, confidence: 1, alias: id }
        : { blocked: true };
    }

    const direct = {
      resume_basicInfo_name: 'personal.name',
      resume_basicInfo_idCardType: 'personal.idType',
      resume_basicInfo_idCard: 'personal.idNumber',
      resume_basicInfo_birthday: 'personal.birthDate',
      resume_basicInfo_mobile: 'personal.phone',
      resume_basicInfo_email: 'personal.email',
      resume_basicInfo_politicalAffinity: 'personal.politicalStatus',
      resume_basicInfo_nation: 'personal.ethnicity',
      resume_basicInfo_weight: 'personal.weight',
      resume_basicInfo_height: 'personal.height',
      resume_basicInfo_maritalStatus: 'personal.maritalStatus',
      resume_basicInfo_currentResidence: 'personal.address',
      resume_basicInfo_expectedInterviewCity: 'intention.city',
      resume_basicInfo_selfAssessment: 'selfEvaluation.personality5',
      resume_skill_0_englishLevel: 'language.certificate',
      resume_skill_0_englishScore: 'language.cet6',
      resume_skill_0_computerSkill: 'skills.short',
      resume_skill_0_otherSituation: 'unconfirmed.hobbies'
    };
    if (direct[id]) return { path: direct[id], confidence: 1, alias: id };

    let educationLevel = '';
    let scope = el;
    for (let depth = 0; scope && depth < 10 && !educationLevel; depth++, scope = scope.parentElement) {
      const marker = Array.from(scope.querySelectorAll?.('[id^="resume_educationHistoryList_"]') || [])
        .map(node => String(node.id || '').match(/^resume_educationHistoryList_(\d+)_/i))
        .find(Boolean);
      if (marker) educationLevel = ['master', 'bachelor', 'highSchool'][Number(marker[1])] || '';
    }
    if (educationLevel) {
      const text = R.normalize(fullLabel);
      const scopedFields = [
        ['学校名称', 'school'], ['院系', 'college'], ['专业名称', 'major'],
        ['入学时间', 'startDate'], ['毕业时间', 'endDate'], ['学历', 'degree'],
        ['专业排名', 'rankBand'], ['全日制', 'fullTime'],
        ['合作交流项目', 'cooperationProject'], ['毕业设计', 'graduationDesign']
      ];
      const hit = scopedFields.find(([label]) => text.includes(R.normalize(label)));
      if (hit) return { path: `education.${educationLevel}.${hit[1]}`, confidence: 1, alias: hit[0] };
    }

    const education = id.match(/^resume_educationHistoryList_(\d+)_(.+)$/i);
    if (education) {
      const level = ['master', 'bachelor', 'highSchool'][Number(education[1])];
      if (!level) return { blocked: true };
      const suffixes = {
        educationLevelCode: 'degree', schoolName: 'school', faculty: 'college',
        majorName: 'major', startDate: 'startDate', endDate: 'endDate',
        educationType: 'educationType', fullTime: 'educationType',
        graduationDesign: 'graduationDesign'
      };
      const suffix = suffixes[education[2]];
      return suffix
        ? { path: `education.${level}.${suffix}`, confidence: 1, alias: id }
        : { blocked: true };
    }

    const internship = id.match(/^resume_internshipExperienceList_(\d+)_(.+)$/i);
    if (internship) {
      if (Number(internship[1]) !== 0) return { blocked: true };
      const suffixes = {
        companyName: 'company', city: 'city', jobResponsibility: 'position',
        startDate: 'startDate', endDate: 'endDate', practiceContent: 'description200'
      };
      const suffix = suffixes[internship[2]];
      return suffix
        ? { path: `experience.${suffix}`, confidence: 1, alias: id }
        : { blocked: true };
    }
    return null;
  }

  function jchcStructuredMatch(el, fullLabel = '') {
    if (location.host !== 'jchctalent.jchc.cn') return null;
    const section = el.closest('.form-cell');
    const sectionTitle = (section?.querySelector('.tit')?.innerText || '').trim();
    const local = R.normalize(`${ownText(el)} | ${String(fullLabel).split('|').slice(0, 2).join('|')}`);

    if (/英语能力|语言能力/.test(sectionTitle)) {
      if (/英语证书名称|证书名称/.test(local)) return { path: 'language.certificate', confidence: 1, alias: '英语证书名称' };
      if (/分数|成绩/.test(local)) return { path: 'language.cet6', confidence: 1, alias: '英语能力分数' };
    }

    if (/主要家庭成员|家庭成员|社会关系/.test(sectionTitle)) {
      const record = el.closest('.form-cell-inner') || section;
      const records = Array.from(section.querySelectorAll('.form-cell-inner')).filter(node =>
        /关系/.test(node.innerText || '') && /姓名/.test(node.innerText || '') && /工作单位|单位/.test(node.innerText || '')
      );
      let index = records.indexOf(record);
      if (index < 0) index = 0;
      if (index > 1) return { blocked: true };
      const fields = [
        [/关系|称谓|与本人关系/, 'relation'], [/姓名/, 'name'],
        [/工作单位|单位名称|任职单位|所在单位/, 'company'],
        [/职位|职务|岗位/, 'position'], [/联系电话|移动电话|手机号码|手机号|电话/, 'phone'],
        [/出生日期|出生年月|生日/, 'birthDate']
      ];
      const hit = fields.find(([pattern]) => pattern.test(local));
      return hit ? { path: `familyMembers.${index}.${hit[1]}`, confidence: 1, alias: hit[0].source } : { blocked: true };
    }
    return null;
  }
  function englishRepeatContextMatch(el, fullLabel = '') {
    const local = R.normalize(`${ownText(el)} | ${String(fullLabel).split('|').slice(0, 2).join('|')}`);
    const card = el.closest('[data-project-index], [class*="project-item"], [class*="projectItem"], .form-part-body, fieldset, [class*="repeat-card"]');
    if (!card) return null;
    const text = String(card.innerText || card.textContent || '').toLowerCase();
    if (!/(project name|project title)/.test(text) || !/(project description|project summary|responsibilities|technology stack)/.test(text)) return null;
    const cards = Array.from(document.querySelectorAll('[data-project-index], [class*="project-item"], [class*="projectItem"], .form-part-body, fieldset, [class*="repeat-card"]'))
      .filter(node => /(project name|project title)/i.test(node.innerText || '') && /(project description|project summary|responsibilities|technology stack)/i.test(node.innerText || ''));
    const explicitIndex = Number(card.getAttribute('data-project-index'));
    const index = Number.isFinite(explicitIndex) && explicitIndex >= 0 ? explicitIndex : Math.max(0, cards.indexOf(card));
    const fields = [
      [/projectname|projecttitle/, 'name'], [/projectrole|roleintheproject/, 'role'],
      [/projectstartdate|startdate/, 'startDate'], [/projectenddate|enddate/, 'endDate'],
      [/technologystack|technologies|toolsused/, 'technologies'],
      [/projectdescription|projectsummary/, 'description'],
      [/projectoutcome|projectresult|achievement/, 'achievement'],
      [/responsibilities|personalresponsibility/, 'responsibility']
    ];
    const hit = fields.find(([pattern]) => pattern.test(local));
    return hit ? { path: `projects.${index}.${hit[1]}`, confidence: 1, alias: hit[0].source } : { blocked: true };
  }
  function matchElement(el, fullLabel, educationLevel = 'auto') {
    const adaptVariant = match => {
      if (!match) return match;
      const maxLength = Number(el.maxLength || el.getAttribute('maxlength') || 0);
      if (match.path === 'selfEvaluation.default' && maxLength > 0 && maxLength <= 150) {
        return { ...match, path: 'selfEvaluation.short' };
      }
      if (match.path === 'experience.description200' && maxLength > 0 && maxLength <= 150) {
        return { ...match, path: 'experience.description100' };
      }
      return match;
    };
    const type = (el.type || '').toLowerCase();
    const fieldText = `${ownText(el)} | ${fullLabel || ''}`;
    const cmb = cmbStructuredMatch(el, fullLabel);
    if (cmb?.blocked) return null;
    if (cmb) return adaptVariant(cmb);
    const jchc = jchcStructuredMatch(el, fullLabel);
    if (jchc?.blocked) return null;
    if (jchc) return adaptVariant(jchc);
    const family = familyContextMatch(el, fullLabel);
    if (family?.blocked) return null;
    if (family) return family;
    const englishRepeat = englishRepeatContextMatch(el, fullLabel);
    if (englishRepeat?.blocked) return null;
    if (englishRepeat) return englishRepeat;
    if (R.shouldNeverAutofill(type, fieldText)) return null;
    const structured = zhiyeStructuredMatch(el, educationLevel);
    if (structured) return adaptVariant(structured);
    const phoenixLabel = phoenixFieldLabel(el);
    if (phoenixLabel) {
      const phoenixMatch = R.matchField(phoenixLabel);
      if (phoenixMatch) return adaptVariant(applyEducationLevel(phoenixMatch, educationLevel, phoenixLabel));
    }
    // Field-owned metadata is more reliable than text inherited from a shared form container.
    const ownMatch = R.matchField(ownText(el));
    if (ownMatch && ownMatch.confidence >= 0.78) return adaptVariant(applyEducationLevel(ownMatch, educationLevel, fullLabel));
    if (R.normalize(ownText(el)) === '请选择' && R.normalize(fullLabel).includes('手机号码')) {
      return { path: 'personal.phoneCountryCode', confidence: 0.95, alias: '手机区号' };
    }
    // The first parts are the current control and its nearest label. Later parts
    // may contain labels belonging to every field in the same dialog.
    const localLabel = String(fullLabel || '').split('|').slice(0, 2).join('|');
    return adaptVariant(applyEducationLevel(R.matchField(localLabel), educationLevel, localLabel));
  }

  function familyContextMatch(el, fullLabel = '') {
    const section = el.closest('.form-cell, section, fieldset, [class*="section"], [class*="module"]');
    const sectionTitle = section?.querySelector('.tit, legend, [class*="section-title"], [class*="module-title"]')?.innerText || '';
    const context = `${ownText(el)} | ${fullLabel} | ${sectionTitle} | ${elementContext(el)}`;
    if (!/父亲|母亲|父母|家庭成员|家庭关系|社会关系|家属|亲属|father|mother|parents?|family members?|family relations?|relatives?/i.test(context)) return null;
    let member = '';
    const localContext = `${ownText(el)} | ${String(fullLabel).split('|').slice(0, 2).join('|')}`;
    const chooseMember = text => {
      const father = /父亲|父方/.test(text);
      const mother = /母亲|母方/.test(text);
      return father !== mother ? (father ? 'father' : 'mother') : '';
    };
    member = chooseMember(localContext);
    if (!member) {
      let scope = el.parentElement;
      for (let depth = 0; scope && depth < 6 && scope !== document.body; depth++, scope = scope.parentElement) {
        const text = (scope.innerText || scope.textContent || '').trim();
        if (text.length <= 600) member = chooseMember(text);
        if (member) break;
      }
    }
    if (!member) {
      const card = el.closest('[data-family-index], [class*="family-item"], [class*="familyItem"], [class*="family-card"], [class*="relative-item"]');
      const parent = card?.parentElement;
      const cards = parent ? Array.from(parent.children).filter(node => /family|relative/i.test(String(node.className || ''))) : [];
      const index = card ? cards.indexOf(card) : -1;
      member = ['father', 'mother'][index] || '';
    }
    if (!member) return { blocked: true };
    const text = R.normalize(`${ownText(el)} | ${String(fullLabel).split('|').slice(0, 2).join('|')}`);
    const fields = [
      [/关系|称谓|与本人关系/, 'relation'], [/姓名/, 'name'],
      [/工作单位|单位名称|任职单位|所在单位|公司名称/, 'company'],
      [/职位|职务|岗位/, 'position'], [/手机号码|手机号|联系电话|电话/, 'phone'],
      [/出生日期|出生年月|生日/, 'birthDate']
    ];
    const hit = fields.find(([pattern]) => pattern.test(text));
    return hit ? { path: `family.${member}.${hit[1]}`, confidence: 1, alias: hit[0].source } : { blocked: true };
  }
  function profileValue(profile, path) {
    const value = R.getByPath(profile, path);
    if (value !== undefined && value !== null && value !== '') return value;
    // Backward-compatible migration for profiles saved before v0.10.0.
    if (path === 'selfEvaluation.personality5') return '认真、负责、务实、主动、坚韧';
    return value;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function repeatGroupBodies(kind) {
    const bodies = Array.from(document.querySelectorAll('.form-part-body'));
    if (kind === 'education') return bodies.filter(node => /(学校名称|毕业学校)/.test(node.innerText || '') && /(专业名称|所学专业)/.test(node.innerText || '') && /学历/.test(node.innerText || ''));
    if (kind === 'project') return bodies.filter(node => /项目名称/.test(node.innerText || '') && /项目描述/.test(node.innerText || ''));
    if (kind === 'award') return bodies.filter(node => /奖项名称/.test(node.innerText || '') && /获奖原因/.test(node.innerText || ''));
    return [];
  }

  function exactTextControl(labels) {
    const wanted = labels.map(R.normalize);
    return Array.from(document.querySelectorAll('button, a, [role="button"], span, div'))
      .filter(visible)
      .filter(node => wanted.includes(R.normalize((node.innerText || node.textContent || '').trim())))
      .sort((a, b) => {
        const ai = /^(BUTTON|A)$/.test(a.tagName) || a.getAttribute('role') === 'button' ? 0 : 1;
        const bi = /^(BUTTON|A)$/.test(b.tagName) || b.getAttribute('role') === 'button' ? 0 : 1;
        return ai - bi;
      })[0] || null;
  }

  async function prepareRepeatGroups(targets) {
    if (!/\.zhiye\.com$/i.test(location.host)) return { supported: false, added: {}, missing: [] };
    const definitions = {
      education: ['添加教育背景', '新增教育背景', '添加教育经历'],
      project: ['添加项目经历', '新增项目经历', '添加项目经验'],
      award: ['添加奖励情况', '新增奖励情况', '添加获奖经历', '添加奖项']
    };
    const added = {};
    const missing = [];
    for (const kind of ['education', 'project', 'award']) {
      const target = Math.max(0, Number(targets?.[kind] || 0));
      let count = repeatGroupBodies(kind).length;
      added[kind] = 0;
      while (count < target) {
        const control = exactTextControl(definitions[kind]);
        if (!control) { missing.push(kind); break; }
        realClick(control);
        await wait(450);
        const nextCount = repeatGroupBodies(kind).length;
        if (nextCount <= count) { missing.push(kind); break; }
        added[kind] += nextCount - count;
        count = nextCount;
      }
    }
    return { supported: true, added, missing };
  }

  function valueVariants(value) {
    const raw = String(value || '').trim();
    const values = new Set([raw]);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      values.add(raw.slice(0, 7));
      values.add(raw.slice(0, 4));
    } else if (/^\d{4}-\d{2}$/.test(raw)) {
      values.add(raw.slice(0, 4));
    }
    values.add(raw.replace(/^(江苏省|浙江省|安徽省|山东省|广东省)/, ''));
    values.add(raw.replace(/[省市区县]/g, ''));
    const city = raw.match(/([^省]+市)$/)?.[1];
    if (city) {
      values.add(city);
      values.add(city.replace(/市$/, ''));
    }
    return [...values].map(R.normalize).filter(Boolean);
  }

  function visibleTextNodes(selector) {
    return Array.from(document.querySelectorAll(selector)).filter(visible);
  }

  function bestTextOption(nodes, value) {
    const targets = valueVariants(value);
    return nodes.find(node => targets.includes(R.normalize(node.innerText || node.textContent))) ||
      nodes.find(node => targets.some(target => {
        const text = R.normalize(node.innerText || node.textContent);
        return target.length >= 2 && (text.includes(target) || target.includes(text));
      }));
  }

  function pressEscape() {
    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    target.blur?.();
  }

  function realClick(el) {
    el.scrollIntoView?.({ block: 'nearest' });
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      const EventCtor = type.startsWith('pointer') && window.PointerEvent ? PointerEvent : MouseEvent;
      el.dispatchEvent(new EventCtor(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
    }
  }

  function dropdownOptions() {
    const selector = [
      '.el-select-dropdown__item:not(.is-disabled)',
      '.el-scrollbar__view > li:not(.is-disabled)',
      '[class*="select-dropdown"] li:not(.is-disabled)',
      '[role="listbox"] [role="option"]:not([aria-disabled="true"])',
      '[role="option"]:not([aria-disabled="true"])',
      '.ant-select-dropdown-menu-item:not(.ant-select-dropdown-menu-item-disabled)',
      '.ant-cascader-menu-item:not(.ant-cascader-menu-item-disabled)'
    ].join(',');
    return visibleTextNodes(selector).filter(node => {
      const text = (node.innerText || node.textContent || '').trim();
      return text && text.length <= 80;
    });
  }

  function selectViaPageBridge(value, el, mode = 'select') {
    return new Promise(resolve => {
      const id = `job-autofill-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const controlId = `control-${id}`;
      const control = el.closest('.el-select, .el-cascader') || el;
      control.setAttribute('data-job-autofill-control', controlId);
      const request = document.createElement('span');
      request.hidden = true;
      request.dataset.requestId = id;
      request.dataset.controlId = controlId;
      request.dataset.value = String(value);
      request.dataset.mode = mode;
      document.documentElement.appendChild(request);
      const cleanup = () => {
        control.removeAttribute('data-job-autofill-control');
        request.remove();
      };
      const timer = setTimeout(() => {
        request.removeEventListener('job-autofill-select-response', onResponse);
        bridgeDebug.push({
          at: new Date().toISOString(), value: String(value), status: 'timeout',
          controlClass: String(control.className || '').slice(0, 160)
        });
        cleanup();
        resolve(false);
      }, 800);
      function onResponse(event) {
        clearTimeout(timer);
        request.removeEventListener('job-autofill-select-response', onResponse);
        const ok = request.dataset.ok === '1';
        bridgeDebug.push({
          at: new Date().toISOString(),
          value: String(value),
          status: ok ? 'ok' : 'failed',
          selectedText: request.dataset.selectedText || '',
          bridgeLoaded: request.dataset.bridgeLoaded || '0',
          controlFound: request.dataset.controlFound || '0',
          selectRootFound: request.dataset.selectRootFound || '0',
          vueFound: request.dataset.vueFound || '0',
          optionsCount: request.dataset.optionsCount || '',
          hasHandleOptionClick: request.dataset.hasHandleOptionClick || '0',
          resultingValue: el.value || ''
        });
        if (bridgeDebug.length > 100) bridgeDebug.splice(0, bridgeDebug.length - 100);
        cleanup();
        resolve(ok);
      }
      request.addEventListener('job-autofill-select-response', onResponse);
      request.dispatchEvent(new Event('job-autofill-select-request', { bubbles: true }));
    });
  }

  function genericVisibleTextOptions(value) {
    const targets = valueVariants(value);
    const nodes = Array.from(document.body.querySelectorAll('li, div, span, p, a'))
      .filter(visible)
      .filter(node => {
        const text = (node.innerText || node.textContent || '').trim();
        if (!text || text.length > 40) return false;
        const normalized = R.normalize(text);
        return targets.some(target => normalized === target ||
          (normalized.length >= 1 && target.includes(normalized)) ||
          (target.length >= 2 && normalized.includes(target)));
      });
    return nodes.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const areaA = ar.width * ar.height;
      const areaB = br.width * br.height;
      if (areaA !== areaB) return areaA - areaB;
      const depth = node => {
        let d = 0, cursor = node;
        while (cursor?.parentElement) { d++; cursor = cursor.parentElement; }
        return d;
      };
      return depth(b) - depth(a);
    });
  }

  async function fillElementSelect(el, value) {
    pressEscape();
    await wait(40);
    const selectRoot = el.closest('.el-select');
    const trigger = selectRoot?.querySelector('.el-select__wrapper') ||
      el.closest('.ant-select, .phoenix-select, [class*="phoenix-select"]') || el;
    realClick(trigger);
    await wait(320);
    if (!el.closest('.ant-select')) {
      const bridged = await selectViaPageBridge(value, el);
      if (bridged) {
        await wait(220);
        return Boolean(existingFieldValue(el) || el.value);
      }
    }
    let option = bestTextOption(dropdownOptions(), value);
    if (!option && (location.host === 'xiaoyuan.zhaopin.com' || /\.zhiye\.com$/i.test(location.host))) {
      option = genericVisibleTextOptions(value)[0];
    }
    if (!option) {
      realClick(trigger);
      return false;
    }
    realClick(option);
    await wait(180);
    const selected = R.normalize(existingFieldValue(el) || el.value || '');
    const targets = valueVariants(value);
    const ok = Boolean(selected) && targets.some(target => selected === target || selected.includes(target) || target.includes(selected));
    if (!ok && !selected) pressEscape();
    return Boolean(ok || selected);
  }

  function locationParts(value) {
    const raw = String(value || '').trim();
    const province = raw.match(/^(.+?省)/)?.[1];
    const city = raw.match(/省(.+?市)/)?.[1] || raw.match(/^(.+?市)/)?.[1];
    const district = raw.match(/市(.+?(?:区|县|市))/)?.[1];
    return [province, city, district].filter(Boolean);
  }

  function cityName(value) {
    const raw = String(value || '').trim();
    const matched = raw.match(/省(.+?)(?:市|$)/)?.[1] || raw.match(/^(.+?)(?:市|$)/)?.[1] || raw;
    return matched.replace(/[省市区县]$/g, '');
  }

  async function fillZhaopinRegion(el, value) {
    const city = cityName(value);
    if (!city) return false;
    const search = Array.from(document.querySelectorAll('input')).find(input =>
      visible(input) && /搜索城市名|搜索城市|搜索区县/.test(input.placeholder || '')
    );
    if (search) {
      setNativeValue(search, city);
      await wait(420);
    }
    const bridged = await selectViaPageBridge(city, el, 'region');
    if (bridged) {
      await wait(300);
      return Boolean(el.value);
    }
    const option = genericVisibleTextOptions(city).find(node => R.normalize(node.innerText || node.textContent) === R.normalize(city));
    if (!option) return false;
    realClick(option);
    await wait(260);
    return Boolean(el.value);
  }

  async function fillElementCascader(el, value) {
    pressEscape();
    await wait(40);
    realClick(el.closest('.el-cascader, .ant-cascader-picker') || el);
    await wait(320);
    if (location.host === 'xiaoyuan.zhaopin.com' &&
        Array.from(document.querySelectorAll('input')).some(input => visible(input) && /搜索城市名|搜索城市|搜索区县/.test(input.placeholder || ''))) {
      return fillZhaopinRegion(el, value);
    }
    const parts = locationParts(value);
    if (!parts.length) return false;
    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      const part = parts[partIndex];
      const bridged = el.closest('.ant-cascader-picker') ? false : await selectViaPageBridge(part, el);
      if (bridged) {
        await wait(260);
        continue;
      }
      const nodes = visibleTextNodes([
        '.el-cascader-node:not(.is-disabled)',
        '.el-cascader-node__label',
        '.el-cascader-menu__list li:not(.is-disabled)',
        '[class*="cascader"] li:not(.is-disabled)',
        '.ant-cascader-menu-item:not(.ant-cascader-menu-item-disabled)'
      ].join(','));
      let option = bestTextOption(nodes, part);
      if (!option && location.host === 'xiaoyuan.zhaopin.com') {
        option = genericVisibleTextOptions(part)[0];
      }
      if (!option) {
        // Many recruitment sites expose only province/city. District is a
        // best-effort third level and must not invalidate a valid city choice.
        if (partIndex >= 2) {
          pressEscape();
          return Boolean(existingFieldValue(el));
        }
        realClick(el.closest('.el-cascader, .ant-cascader-picker') || el);
        return false;
      }
      realClick(option.closest('.el-cascader-node') || option);
      await wait(260);
    }
    const selected = R.normalize(existingFieldValue(el) || el.value || '');
    if (!selected) pressEscape();
    return Boolean(selected);
  }

  async function fillElementDate(el, value) {
    const normalized = String(value || '').trim().replace(/\//g, '-');
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(el, normalized); else el.value = normalized;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
    el.blur();
    await wait(120);
    return Boolean(el.value);
  }

  async function fillReadonlyControl(el, value, path) {
    const isDatePath = /(?:birthDate|startDate|endDate|partyJoinDate)$/i.test(path || '');
    const isLocationPath = /(?:currentCity|household|studentOrigin|nativePlace)$/i.test(path || '');
    if (el.closest('.el-date-editor, .ant-picker') || isDatePath) {
      if (String(value).trim() === '至今') {
        const scope = el.closest('form, .el-form, [class*="form"]') || document;
        const ongoing = Array.from(scope.querySelectorAll('label, span, button, [role="checkbox"]'))
          .find(node => visible(node) && R.normalize(node.innerText || node.textContent || node.getAttribute('aria-label')) === '至今');
        if (ongoing) {
          realClick(ongoing);
          await wait(150);
          return true;
        }
        return false;
      }
      return fillElementDate(el, value);
    }
    if (el.closest('.el-cascader, .ant-cascader') || isLocationPath) {
      return fillElementCascader(el, value);
    }
    if (el.closest('.el-select, .ant-select') || el.getAttribute('role') === 'combobox' || /请选择/.test(el.placeholder || '')) {
      return fillElementSelect(el, value);
    }
    return false;
  }

  function nearbyText(el) {
    const chunks = [
      el.getAttribute('aria-label'), el.getAttribute('data-placeholder'),
      el.getAttribute('data-label'), el.getAttribute('title'),
      el.placeholder, el.name, el.id
    ];
    if (el.labels) chunks.push(...Array.from(el.labels).map(x => x.innerText));
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const root = el.getRootNode?.() || document;
      chunks.push(...labelledBy.split(/\s+/).map(id => root.getElementById?.(id)?.innerText || document.getElementById(id)?.innerText));
    }
    const item = el.closest([
      '.aui-form-item', '.aui-form-field', '.aui-field',
      '.el-form-item', '.ant-form-item', '.arco-form-item', '.ivu-form-item',
      '.form-item', '.field-item', '[class*="formItem"]', '[class*="form-item"]'
    ].join(','));
    if (item) {
      const label = item.querySelector([
        ':scope > label', ':scope > .aui-form-item__label',
        ':scope > .aui-form-field__label', ':scope > .aui-field__label',
        ':scope > [class*="form-item__label"]', ':scope > [class*="field__label"]',
        ':scope > .form-item__title .form-item__text', ':scope label.form-item__text',
        ':scope > .el-form-item__label',
        ':scope > .ant-form-item-label', ':scope > .arco-form-item-label',
        ':scope > [class*="form-label"]'
      ].join(','));
      if (label) chunks.push(label.innerText);
      if (!label) {
        const text = Array.from(item.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent.trim()).filter(Boolean).join(' ');
        if (text && text.length < 80) chunks.push(text);
      }
    }
    const previous = el.previousElementSibling;
    if (previous && (previous.tagName === 'LABEL' || /label/i.test(previous.className || ''))) {
      chunks.push(previous.innerText);
    }
    let cursor = el.parentElement;
    for (let depth = 0; cursor && depth < 6 && cursor !== document.body; depth++, cursor = cursor.parentElement) {
      const labelNodes = cursor.querySelectorAll([
        ':scope > label', ':scope > [class*="label"]',
        ':scope > div > label', ':scope > div > [class*="label"]'
      ].join(','));
      for (const node of Array.from(labelNodes).slice(0, 4)) {
        const text = (node.innerText || node.textContent || '').trim();
        if (text && text.length <= 80) chunks.push(text);
      }
      const sibling = cursor.previousElementSibling;
      if (sibling) {
        const text = (sibling.innerText || sibling.textContent || '').trim();
        if (text && text.length <= 80) chunks.push(text);
      }
    }
    return [...new Set(chunks.filter(Boolean).map(x => String(x).trim()).filter(Boolean))]
      .join(' | ').slice(0, 300);
  }

  function elementContext(el) {
    const rows = [];
    let cursor = el;
    for (let depth = 0; cursor && depth < 5 && cursor !== document.body; depth++, cursor = cursor.parentElement) {
      const directText = Array.from(cursor.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim()).filter(Boolean).join(' ');
      const labels = Array.from(cursor.querySelectorAll(':scope > label, :scope > [class*="label"]'))
        .map(node => (node.innerText || node.textContent || '').trim()).filter(Boolean);
      const value = [...labels, directText].filter(Boolean).join(' / ');
      if (value && value.length <= 160) rows.push(value);
    }
    return [...new Set(rows)].join(' > ').slice(0, 500);
  }

  function scan(profile, educationLevel) {
    const rawElements = candidates();
    const seenControls = new Set();
    const elements = rawElements.filter(el => {
      if (['radio', 'checkbox'].includes((el.type || '').toLowerCase())) return true;
      const control = el.closest('.el-select, .el-cascader, .ant-select, .ant-cascader, .ant-cascader-picker, .ant-picker, .phoenix-select, [class*="phoenix-select"], [role="combobox"]') || el;
      if (seenControls.has(control)) return false;
      seenControls.add(control);
      return true;
    });

    return elements.map((el, index) => {
      const label = nearbyText(el);
      const match = matchElement(el, label, educationLevel);
      const value = match ? profileValue(profile, match.path) : undefined;
      const currentValue = existingFieldValue(el, value);
      const classification = match ? (value == null || value === ''
        ? { category: 'missing', reason: '资料库中该字段为空' }
        : currentValue
          ? { category: 'existing', reason: '页面中已有内容，默认不会覆盖' }
          : { category: 'matched', reason: '' }) : R.classifyUnmatchedField(el.type, label);
      return {
        index,
        label,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        className: String(el.className || '').slice(0, 160),
        context: elementContext(el),
        placeholder: el.placeholder || el.getAttribute('data-placeholder') || '',
        name: el.name || '',
        id: el.id || '',
        readOnly: Boolean(el.readOnly || el.getAttribute('aria-readonly') === 'true'),
        type: (el.type || '').toLowerCase(),
        path: match?.path || '',
        category: classification.category,
        reason: classification.reason,
        confidence: match?.confidence || 0,
        hasValue: value !== undefined && value !== null && String(value).length > 0,
        currentValue: currentValue.slice(0, 80),
        preview: value == null ? '' : String(value).slice(0, 80)
      };
    });
  }

  function pageState() {
    const clickableSelector = 'button, a, [role="button"], [class*="edit"], [class*="add"]';
    const actions = [];
    for (const root of searchableRoots()) {
      for (const el of root.querySelectorAll(clickableSelector)) {
        if (!visible(el)) continue;
        const text = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.title || '').trim();
        if (text && /编辑|添加|新增|完善|修改/.test(text)) actions.push(text.slice(0, 40));
      }
    }
    const bodyText = (document.body?.innerText || '').slice(0, 5000);
    return {
      url: location.href,
      title: document.title,
      isResumeOverview: /个人信息/.test(bodyText) && /教育经历/.test(bodyText) && /编辑|未完成/.test(bodyText),
      editActions: [...new Set(actions)].slice(0, 20)
    };
  }

  function diagnosticControlRoot(el) {
    return el.closest([
      '.el-select', '.el-cascader', '.el-radio-group', '.el-checkbox-group',
      '.ant-select', '.ant-cascader', '.ant-cascader-picker', '.ant-radio-group', '.ant-checkbox-group',
      '.phoenix-select', '[class*="phoenix-select"]', '[role="radiogroup"]', '[role="combobox"]',
      '.el-form-item', '.ant-form-item', '.form-item', '.form-cell-inner', 'fieldset'
    ].join(',')) || el;
  }

  function diagnosticNode(node) {
    if (!node) return null;
    const className = String(node.className || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const value = 'value' in node ? meaningfulValue(node.value) : '';
    return {
      tag: node.tagName?.toLowerCase() || '', type: (node.type || '').toLowerCase(),
      role: node.getAttribute?.('role') || '', className,
      id: String(node.id || '').slice(0, 120), name: String(node.name || '').slice(0, 120),
      placeholder: String(node.placeholder || node.getAttribute?.('data-placeholder') || '').slice(0, 160),
      checked: Boolean(node.checked), selected: Boolean(node.selected), disabled: Boolean(node.disabled),
      readOnly: Boolean(node.readOnly || node.getAttribute?.('aria-readonly') === 'true'),
      ariaChecked: node.getAttribute?.('aria-checked') || '', ariaSelected: node.getAttribute?.('aria-selected') || '',
      ariaExpanded: node.getAttribute?.('aria-expanded') || '', ariaHaspopup: node.getAttribute?.('aria-haspopup') || '',
      dataValuePresent: Boolean(node.getAttribute?.('data-value')),
      dataValueLength: String(node.getAttribute?.('data-value') || '').length,
      value: (node.type || '').toLowerCase() === 'hidden' ? '' : String(value || '').slice(0, 160),
      valueLength: String(node.value || '').length,
      text: String(node.innerText || node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 240)
    };
  }

  function diagnosticSkeleton(root, depth = 0) {
    if (!root || depth > 2) return null;
    const item = diagnosticNode(root);
    item.children = Array.from(root.children || []).slice(0, 12)
      .map(child => diagnosticSkeleton(child, depth + 1)).filter(Boolean);
    return item;
  }

  function controlDiagnostics(profile = {}, educationLevel = 'auto') {
    return candidates().slice(0, 250).map((el, index) => {
      const label = nearbyText(el);
      const match = matchElement(el, label, educationLevel);
      const expectedValue = match ? profileValue(profile, match.path) : undefined;
      const root = diagnosticControlRoot(el);
      const selectedSelector = [
        'input:checked', 'option:checked', '[aria-checked="true"]', '[aria-selected="true"]',
        '.is-checked', '.is-selected', '.ant-radio-wrapper-checked', '.ant-checkbox-wrapper-checked',
        '[class*="radio"][class*="checked"]', '[class*="selected-value"]', '[class*="selection-item"]'
      ].join(',');
      const selectedNodes = Array.from(root.querySelectorAll?.(selectedSelector) || []).slice(0, 20).map(diagnosticNode);
      const ancestors = [];
      let cursor = el;
      for (let depth = 0; cursor && depth < 5 && cursor !== document.body; depth++, cursor = cursor.parentElement) {
        ancestors.push(diagnosticNode(cursor));
      }
      const currentValue = existingFieldValue(el, expectedValue);
      return {
        index, label, path: match?.path || '', confidence: match?.confidence || 0,
        expectedValue: expectedValue == null ? '' : String(expectedValue).slice(0, 160),
        currentValue: String(currentValue || '').slice(0, 160),
        decision: currentValue ? 'preserve-existing' : 'consider-empty',
        element: diagnosticNode(el), root: diagnosticNode(root), ancestors,
        selectedNodes, skeleton: diagnosticSkeleton(root)
      };
    });
  }
  function uiDiagnostics() {
    const rows = [];
    for (const node of Array.from(document.body?.querySelectorAll('*') || [])) {
      if (!visible(node)) continue;
      const text = (node.innerText || node.textContent || '').trim().replace(/\s+/g, ' ');
      if (!text || text.length > 60) continue;
      const childTexts = Array.from(node.children || [])
        .map(child => (child.innerText || child.textContent || '').trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      const isLeafText = !childTexts.some(childText => childText === text);
      const ancestry = [node, node.parentElement, node.parentElement?.parentElement]
        .filter(Boolean)
        .map(el => `${el.tagName.toLowerCase()}.${String(el.className || '').replace(/\s+/g, '.').slice(0, 160)}`)
        .join(' > ');
      const looksInteractive = /select|drop|pop|menu|option|cascader|picker|scroll|list|item/i.test(ancestry) ||
        ['LI', 'A', 'BUTTON'].includes(node.tagName) || node.getAttribute('role');
      if (!isLeafText && !looksInteractive) continue;
      const rect = node.getBoundingClientRect();
      rows.push({
        text,
        tag: node.tagName.toLowerCase(),
        className: String(node.className || '').slice(0, 200),
        role: node.getAttribute('role') || '',
        ancestry,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
      });
      if (rows.length >= 500) break;
    }
    return rows;
  }

  function setNativeValue(el, value) {
    if (el.isContentEditable) {
      el.focus();
      el.textContent = value;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      return;
    }
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function meaningfulValue(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return '';
    if (/^(?:--|-|请选择|请选择.*|请填写|请填写.*|请输入|请输入.*|暂无|无|select|please select.*|choose|please choose.*|enter|please enter.*|not selected|none)$/i.test(text)) return '';
    return text;
  }

  // Read the value that is already visible/selected on the page. This check is
  // intentionally performed immediately before every write so that fields
  // completed by the user, the browser, or a previous scan are never replaced.
  function existingFieldValue(el, expectedValue = '') {
    const type = (el.type || '').toLowerCase();
    if (type === 'radio' || type === 'checkbox') {
      if (el.name) {
        const root = el.form || el.getRootNode?.() || document;
        const escaped = window.CSS?.escape ? CSS.escape(el.name) : el.name.replace(/["\\]/g, '\\$&');
        const checked = root.querySelector?.(`input[name="${escaped}"]:checked`);
        if (checked) return meaningfulValue(checked.value || checked.getAttribute('aria-label') || checked.closest('label')?.innerText || '已选择');
      }
      if (el.checked || el.getAttribute('aria-checked') === 'true') {
        return meaningfulValue(el.value || el.getAttribute('aria-label') || el.closest('label')?.innerText || '已选择');
      }
      // Many React/Vue radio groups keep selection only on a wrapper class or
      // aria-checked node, and some sites omit the native input name entirely.
      const group = el.closest([
        '[role="radiogroup"]', '.el-radio-group', '.ant-radio-group', '.van-radio-group',
        '[class*="radio-group"]', '[class*="radioGroup"]', '[class*="checkbox-group"]',
        'fieldset', '.form-item', '.form-cell-inner'
      ].join(','));
      if (group) {
        const selected = group.querySelector([
          'input[type="radio"]:checked', 'input[type="checkbox"]:checked',
          '[role="radio"][aria-checked="true"]', '[role="checkbox"][aria-checked="true"]',
          '.el-radio.is-checked', '.el-checkbox.is-checked', '.ant-radio-wrapper-checked',
          '.ant-checkbox-wrapper-checked', '.van-radio[aria-checked="true"]',
          '[class*="radio"][class*="checked"]', '[class*="checkbox"][class*="checked"]'
        ].join(','));
        if (selected) {
          const selectedInput = selected.matches('input') ? selected : selected.querySelector('input');
          return meaningfulValue(selectedInput?.value || selected.getAttribute('data-value') || selected.getAttribute('aria-label') || selected.innerText || selected.textContent || '已选择');
        }
      }
      return '';
    }
    if (el.tagName === 'SELECT') {
      const option = el.selectedOptions?.[0];
      return meaningfulValue(option?.value || option?.textContent || el.value);
    }
    if (el.isContentEditable) return meaningfulValue(el.innerText || el.textContent);

    const direct = meaningfulValue(el.value);
    if (direct) return direct;

    const control = el.closest([
      '.el-select', '.el-cascader', '.el-date-editor', '.ant-select', '.ant-cascader', '.ant-cascader-picker', '.ant-picker', '.phoenix-select',
      '[class*="phoenix-select"]', '[class*="select-container"]', '[class*="dropdown"]', '[role="combobox"]'
    ].join(','));
    if (!control) return '';

    // Component libraries often keep the real value in a hidden model input and
    // render the selected label in another node. Inspect every reliable signal;
    // never rely on the first matching node, which may still be an empty search box.
    const signals = [
      control.getAttribute('data-value'), control.getAttribute('data-selected-value'),
      control.getAttribute('aria-valuetext'), control.getAttribute('aria-valuenow')
    ];
    const selector = [
      '.el-select__selected-item', '.el-cascader__label', '.ant-select-selection-item',
      '.el-select__tags-text', '.ant-select-selection-selected-value', '.ant-cascader-picker-label',
      '.phoenix-select__selection-item', '[class*="selected-value"]', '[class*="selection-item"]',
      '[class*="selected-label"]', '[data-selected="true"]', '[aria-selected="true"]',
      'input[type="hidden"]', '.ant-picker-input input', '.el-input__inner'
    ].join(',');
    for (const node of control.querySelectorAll(selector)) {
      signals.push(node.value, node.getAttribute?.('data-value'), node.getAttribute?.('aria-label'), node.innerText, node.textContent);
    }
    const selectedValue = signals.map(meaningfulValue).find(Boolean);
    if (selectedValue) return selectedValue;
    // Last-resort guard for components that expose the selected value only as
    // plain visible text. Match only the expected profile value, never a label.
    const expected = R.normalize(expectedValue);
    const visibleControlText = String(control.innerText || control.textContent || '').trim();
    const normalizedControlText = R.normalize(visibleControlText);
    if (expected && normalizedControlText.includes(expected)) return String(expectedValue).trim();
    return '';
  }

  function fillSelect(el, value) {
    const target = R.normalize(value);
    const option = Array.from(el.options).find(o => {
      const text = R.normalize(o.textContent);
      return text === target || text.includes(target) || target.includes(text);
    });
    if (!option) return false;
    el.value = option.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  async function fill(profile, threshold, educationLevel, overwrite = false) {
    const rawElements = candidates();
    const seenControls = new Set();
    const elements = rawElements.filter(el => {
      if (['radio', 'checkbox'].includes((el.type || '').toLowerCase())) return true;
      const control = el.closest('.el-select, .el-cascader, .ant-select, .ant-cascader, .ant-cascader-picker, .ant-picker, .phoenix-select, [class*="phoenix-select"], [role="combobox"]') || el;
      if (seenControls.has(control)) return false;
      seenControls.add(control);
      return true;
    });
    let filled = 0, skipped = 0, preserved = 0;
    const details = [];
    for (const el of elements) {
      const label = nearbyText(el);
      const match = matchElement(el, label, educationLevel);
      const value = match ? profileValue(profile, match.path) : undefined;
      if (!match || match.confidence < threshold || value == null || value === '') continue;
      const currentValue = existingFieldValue(el, value);
      if (!overwrite && currentValue) {
        preserved++;
        el.dataset.jobAutofill = 'preserved';
        details.push({ label, path: match.path, action: 'preserved', currentValue: currentValue.slice(0, 80) });
        continue;
      }
      let ok = false;
      if (el.tagName === 'SELECT') ok = fillSelect(el, value);
      else if (el.matches('.phoenix-select__input') || el.closest('.phoenix-select')) {
        ok = await fillElementSelect(el, value);
      }
      else if (el.matches('.ant-cascader-picker') || el.closest('.ant-cascader-picker')) {
        ok = await fillElementCascader(el, value);
      }
      else if (el.matches('.ant-select-selection') || el.closest('.ant-select')) {
        ok = await fillElementSelect(el, value);
      }
      else if (el.readOnly || el.getAttribute('aria-readonly') === 'true') {
        ok = await fillReadonlyControl(el, value, match.path);
      }
      else if (el.getAttribute('role') === 'combobox' && el.tagName !== 'INPUT') {
        ok = false;
      } else if (['radio', 'checkbox'].includes((el.type || '').toLowerCase())) {
        const target = R.normalize(value);
        const closestLabel = el.closest('label')?.innerText ||
          (el.id ? document.querySelector(`label[for="${window.CSS?.escape ? CSS.escape(el.id) : el.id}"]`)?.innerText : '') ||
          el.nextElementSibling?.innerText || el.nextSibling?.textContent || '';
        const optionLabel = R.normalize(closestLabel) || R.normalize(String(label || '').split('|')[0]);
        const rawValue = R.normalize(el.value);
        const candidate = optionLabel || rawValue;
        const negatedTarget = candidate === `非${target}` || candidate === `不${target}` || candidate === `否${target}`;
        const matches = !negatedTarget && (candidate === target || rawValue === target ||
          (target.length >= 2 && candidate.includes(target)));
        if (matches) {
          el.click(); ok = true;
        }
      } else {
        setNativeValue(el, String(value)); ok = true;
      }
      if (ok) {
        filled++;
        el.dataset.jobAutofill = 'filled';
        el.style.outline = '2px solid #16a34a';
        details.push({ label, path: match.path });
      } else skipped++;
    }
    return { filled, skipped, preserved, details };
  }

  const messageListener = (message, sender, sendResponse) => {
    if (message.type === 'PING') sendResponse({ ready: true, version: CONTENT_VERSION, url: location.href, frame: window === window.top ? 'top' : 'child' });
    if (message.type === 'SCAN') sendResponse({ fields: scan(message.profile || {}, message.educationLevel), pageState: pageState() });
    if (message.type === 'DIAGNOSE_UI') sendResponse({ nodes: uiDiagnostics(), controls: controlDiagnostics(message.profile || {}, message.educationLevel), pageState: pageState(), bridgeDebug });
    if (message.type === 'PREPARE_REPEAT_GROUPS') {
      prepareRepeatGroups(message.targets || {}).then(sendResponse);
      return true;
    }
    if (message.type === 'FILL') {
      fill(message.profile || {}, message.threshold || 0.9, message.educationLevel, Boolean(message.overwrite)).then(sendResponse);
      return true;
    }
  };
  window.__JOB_AUTOFILL_MESSAGE_LISTENER__ = messageListener;
  chrome.runtime.onMessage.addListener(messageListener);
})();
