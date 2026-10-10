(function () {
  const rules = [
    ['personal.name', ['姓名', '真实姓名', '应聘者姓名', 'candidateName', 'fullName', 'name']],
    ['personal.gender', ['性别', 'gender']],
    ['personal.nationality', ['国籍', '国籍/地区']],
    ['personal.ethnicity', ['民族']],
    ['personal.health', ['健康状况', '健康状态']],
    ['personal.maritalStatus', ['婚姻状况', '婚姻状态']],
    ['personal.constellation', ['星座']],
    ['personal.height', ['身高', '身高cm', '身高（cm）']],
    ['personal.weight', ['体重', '体重kg', '体重（kg）']],
    ['personal.birthDate', ['出生日期', '出生年月', '生日', 'birth date', 'birthday']],
    ['personal.politicalStatus', ['政治面貌']],
    ['personal.partyJoinDate', ['入党时间', '加入中国共产党时间', '入党日期']],
    ['personal.partyJoinDate', ['参加党派时间']],
    ['personal.idType', ['证件类型']],
    ['personal.idNumber', ['身份证号', '身份证号码', '证件号码', '证件号']],
    ['personal.phone', ['手机号', '手机号码', '联系电话', '移动电话', 'mobile', 'phone']],
    ['personal.email', ['邮箱', '电子邮箱', '邮箱地址', '常用邮箱', '用于接收面试及录用通知', 'email', 'e-mail']],
    ['personal.address', ['通信地址', '通讯地址', '联系地址', '现住址', '详细地址']],
    ['personal.birthPlace', ['出生地', '出生所在地']],
    ['personal.nativePlace', ['籍贯']],
    ['personal.household', ['户籍所在地', '户口所在地', '户籍地址']],
    ['personal.studentOrigin', ['生源地', '高考生源地']],
    ['personal.currentCity', ['现居住地', '现居城市', '现居住城市']],
    ['personal.foreignNationality', ['外国国籍', '是否有外国国籍', '是否拥有外国国籍', '有无外国国籍', '外国国籍/移居国外', '外国国籍、国（境）外永久居留权']],
    ['personal.emigratedAbroad', ['移居国外', '是否移居国外', '有无移居国外']],
    ['personal.isOverseasStudent', ['是否留学生', '留学生']],
    ['personal.github', ['github', '个人主页', '技术主页']],
    ['education.master.school', ['硕士学校', '研究生学校', '毕业院校', '学校名称', '院校名称']],
    ['education.master.college', ['硕士院系', '学院', '院系', '请填写院系完整中文名称，如“机械工程系”']],
    ['education.master.major', ['硕士专业', '研究生专业', '所学专业', '专业名称']],
    ['education.master.degree', ['最高学历', '学历']],
    ['education.master.academicDegree', ['学位']],
    ['education.master.educationType', ['受教育类型', '教育类型', '培养方式', '学习方式']],
    ['education.master.fullTime', ['是否全日制', '是否为全日制']],
    ['education.master.duration', ['学制', '学习年限', '学制年限']],
    ['education.master.startDate', ['入学时间', '开始时间', '就读开始时间']],
    ['education.master.endDate', ['毕业时间', '结束时间', '预计毕业时间', '获得毕业证或学位证时间']],
    ['education.master.gpa', ['绩点', 'gpa']],
    ['education.master.gpaScore', ['平均绩点', '平均分', '平均绩点/平均分']],
    ['education.master.gpaScale', ['满绩点', '总分', '满绩点/总分']],
    ['education.master.rank', ['专业排名', '成绩排名']],
    ['education.master.rankNumber', ['年级名次', '专业名次', '排名名次']],
    ['education.master.rankTotal', ['年级总人数', '专业总人数', '排名总人数']],
    ['education.master.rankPercent', ['专业成绩排名前%', '排名前%', '前百分之']],
    ['education.master.rankBand', ['年级排名', '排名区间']],
    ['education.master.researchDirection', ['研究方向']],
    ['education.master.courses', ['专业课程', '主修课程']],
    ['education.master.domesticSchool', ['该院校是否为国内院校', '是否为国内院校', '国内院校']],
    ['education.master.onlineStudentStatusVerificationCode', ['在线学籍报告验证码', '学籍报告验证码', '在线验证码', '在线验证报告验证码']],
    ['language.name', ['外语种类', '语种']],
    ['language.certificate', ['外语证书', '语言证书', '英语证书', '英语证书名称']],
    ['language.cet6', ['六级成绩', '外语考试成绩', 'cet-6', 'cet6']],
    ['experience.company', ['实习公司', '公司名称', '单位名称', '工作单位']],
    ['experience.industry', ['所属行业', '公司行业', '单位行业', '行业']],
    ['experience.department', ['实习部门', '所属部门', '部门']],
    ['experience.position', ['实习职位', '职位', '职位名称', '岗位名称', '职务']],
    ['experience.workType', ['工作类型', '工作性质', '经历类型', '实习类型']],
    ['experience.startDate', ['实习开始时间', '工作开始时间', '入职时间', '开始任职时间']],
    ['experience.endDate', ['实习结束时间', '工作结束时间', '离职时间', '结束任职时间']],
    ['experience.description200', ['工作内容', '实习内容', '职责描述', '工作描述', '主要职责']],
    ['experience.achievement', ['工作业绩', '实习成果', '主要业绩', '取得业绩']],
    ['experience.isPrimary', ['是否为主要经历', '是否主要经历', '主要经历']],
    ['skills.short', ['专业技能', '技能特长', '技能描述']],
    ['selfEvaluation.default', ['自我评价', '个人评价', '个人优势', '简述您的能力、特长、项目经历等，请客观评价自己并展现自我优势']],
    ['intention.position', ['期望职位', '应聘岗位']],
    ['intention.city', ['期望工作地', '期望工作地点', '意向城市', '工作地点']]
    ,['intention.industry', ['期望从事行业', '意向行业']]
    ,['intention.currentMonthlySalary', ['现月薪', '现月薪税前', '目前月薪']]
    ,['intention.arrivalTime', ['到岗时间', '可到岗时间']]
    ,['experience.years', ['工作年限', '工作经验年限']]
    ,['intention.minimumMonthlySalary', ['税前月薪最低要求', '最低期望月薪', '最低月薪']]
    ,['intention.careerPlan', ['职业规划', '个人职业规划']]
    ,['unconfirmed.hobbies', ['个人爱好', '兴趣爱好', '爱好特长']]
    ,['thesis.introduction', ['毕业论文简介', '论文简介', '毕业设计简介']]
    ,['personal.nationality', ['nationality', 'citizenship']]
    ,['personal.ethnicity', ['ethnicity', 'ethnic group']]
    ,['personal.health', ['health status', 'health condition']]
    ,['personal.maritalStatus', ['marital status']]
    ,['personal.height', ['height', 'height cm']]
    ,['personal.weight', ['weight', 'weight kg']]
    ,['personal.idType', ['id type', 'identity document type', 'document type']]
    ,['personal.idNumber', ['id number', 'identity number', 'national id']]
    ,['personal.address', ['mailing address', 'correspondence address', 'residential address', 'current address']]
    ,['personal.birthPlace', ['place of birth', 'birthplace']]
    ,['personal.nativePlace', ['native place', 'hometown']]
    ,['personal.household', ['registered residence', 'household registration']]
    ,['personal.currentCity', ['current city', 'city of residence', 'current residence']]
    ,['personal.isOverseasStudent', ['international student', 'overseas student']]
    ,['education.master.school', ['university', 'school name', 'institution', 'institution name', 'graduation school']]
    ,['education.master.college', ['college', 'faculty', 'academic department']]
    ,['education.master.major', ['major', 'field of study', 'programme', 'study program']]
    ,['education.master.degree', ['education level', 'highest education', 'qualification']]
    ,['education.master.academicDegree', ['academic degree', 'degree type']]
    ,['education.master.educationType', ['education type', 'study mode']]
    ,['education.master.fullTime', ['full time', 'full-time']]
    ,['education.master.duration', ['program duration', 'programme duration', 'study duration']]
    ,['education.master.startDate', ['enrollment date', 'education start date', 'study start date']]
    ,['education.master.endDate', ['graduation date', 'expected graduation date', 'education end date']]
    ,['education.master.gpa', ['grade point average']]
    ,['education.master.rank', ['class rank', 'academic rank']]
    ,['education.master.rankTotal', ['class size', 'total students']]
    ,['education.master.rankPercent', ['rank percentage', 'top percentage']]
    ,['education.master.researchDirection', ['research direction', 'research area', 'research focus']]
    ,['education.master.courses', ['major courses', 'relevant coursework', 'main courses']]
    ,['language.name', ['foreign language', 'language name']]
    ,['language.certificate', ['language certificate', 'english certificate', 'language qualification']]
    ,['language.cet6', ['cet-6 score', 'cet6 score', 'language test score']]
    ,['experience.company', ['employer', 'company name', 'organization name']]
    ,['experience.industry', ['industry', 'business sector']]
    ,['experience.department', ['work department', 'team name']]
    ,['experience.position', ['job title', 'position title', 'role title']]
    ,['experience.workType', ['employment type', 'work type']]
    ,['experience.startDate', ['employment start date', 'internship start date', 'work start date']]
    ,['experience.endDate', ['employment end date', 'internship end date', 'work end date']]
    ,['experience.description200', ['job description', 'responsibilities', 'main duties']]
    ,['experience.achievement', ['work achievements', 'accomplishments']]
    ,['skills.short', ['technical skills', 'professional skills', 'skill summary']]
    ,['selfEvaluation.default', ['self evaluation', 'personal statement', 'professional summary', 'profile summary']]
    ,['intention.position', ['desired position', 'target position', 'job preference']]
    ,['intention.city', ['preferred location', 'desired location', 'work location']]
    ,['intention.careerPlan', ['career plan', 'career goals']]
    ,['unconfirmed.hobbies', ['hobbies', 'interests']]
    ,['thesis.introduction', ['thesis summary', 'dissertation summary', 'final project summary']]  ];

  const protectedKeys = new Set([
    'salary', 'transfer', 'relative', 'health', 'discipline', 'submit'
  ]);

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/[\s：:＊*()（）_\-\/]/g, '');
  }

  function getByPath(obj, path) {
    return path.split('.').reduce((value, key) => value == null ? undefined : value[key], obj);
  }

  function shouldNeverAutofill(type, fieldText) {
    const text = String(fieldText || '');
    if (/紧急联系人|紧急联系电话|亲属|家庭成员|家属|emergency contact|family member|relative|招聘信息来源|招聘渠道|infoSourceName|薪资|薪酬|年薪|月薪|salary|compensation/i.test(text)) return true;
    if (['radio', 'checkbox'].includes(String(type || '').toLowerCase()) &&
        /服从|调剂|承诺|保证|声明|隐私|协议|授权|申报专项|愿意申报|是否愿意/i.test(text)) return true;
    return false;
  }

  function classifyUnmatchedField(type, fieldText) {
    const kind = String(type || '').toLowerCase();
    const text = String(fieldText || '');
    if (kind === 'radio' || kind === 'checkbox') {
      return { category: 'manual', reason: '本人判断或承诺，需人工确认' };
    }
    if (/薪资|薪酬|年薪|月薪/.test(text)) {
      return { category: 'manual', reason: '薪酬口径需人工确认' };
    }
    if (/紧急联系人|紧急联系电话|亲属|家庭成员|家属/.test(text)) {
      return { category: 'missing', reason: '不能使用本人姓名或电话代替' };
    }
    if (/生源类型|招聘信息来源|招聘渠道|infoSourceName/i.test(text)) {
      return { category: 'missing', reason: '资料库暂无已确认的答案' };
    }
    return { category: 'unknown', reason: '尚未识别字段含义' };
  }

  function matchField(text) {
    const parts = String(text || '').split('|').map(normalize).filter(Boolean);
    if (!parts.length) return null;
    let best = null;
    for (const [path, aliases] of rules) {
      for (const alias of aliases) {
        const candidate = normalize(alias);
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const part = parts[partIndex];
          let confidence = 0;
          if (part === candidate) confidence = 1;
          // A bare English token must not turn infoSourceName into the applicant's name.
          else if (candidate === 'name' || candidate === 'phone') continue;
          else if (candidate.length >= 3 && (part.startsWith(candidate) || part.endsWith(candidate))) confidence = 0.94;
          else if (candidate.length >= 4 && part.includes(candidate)) confidence = 0.86;
          else if (candidate.length >= 2 && /[\u3400-\u9fff]/.test(candidate) && part.includes(candidate)) confidence = 0.94;
          else if (part.length >= 4 && candidate.includes(part)) confidence = 0.78;
          const adjusted = confidence ? Math.max(0, confidence - partIndex * 0.015) : 0;
          if (adjusted && (!best || adjusted > best.confidence ||
              (adjusted === best.confidence && candidate.length > normalize(best.alias).length))) {
            best = { path, confidence: adjusted, alias };
          }
        }
      }
    }
    return best;
  }

  window.JobAutofillRules = { rules, protectedKeys, normalize, getByPath, matchField, shouldNeverAutofill, classifyUnmatchedField };
})();
