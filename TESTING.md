# 测试说明

## 发布前自动检查

运行：

```powershell
node scripts/validate-release.js
node test-bankcomm-rules.js
```

检查内容包括Manifest V3、禁止的全站权限、隐私文件、个人信息特征、JavaScript语法和必需发布材料。

## 人工测试

1. 新安装后确认网页不会被自动读取，填写按钮保持禁用。
2. 在资料页测试新建、示例恢复、保存、导入和导出。
3. 打开普通HTML表单，点击扫描后检查字段数量，再执行填充。
4. 验证已有内容默认不会被覆盖。
5. 验证切换标签页后必须重新扫描。
6. 验证诊断文件名带 `redacted`，并人工搜索姓名、手机号、证件号、邮箱和地址。
7. 在Element Plus、Ant Design及iframe页面上分别测试下拉框。
8. 确认扩展不会点击提交、上传附件、处理验证码或代答测评。

## 结构诊断检查

导出诊断后，检查 controlStructures 中是否包含 element、root、ancestors、selectedNodes、skeleton、currentValue 与 decision。确认隐藏输入只包含 valueLength，不包含隐藏值，并人工搜索个人信息后再分享。
