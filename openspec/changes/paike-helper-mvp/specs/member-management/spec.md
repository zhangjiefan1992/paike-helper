## ADDED Requirements

### Requirement: Member list displays all members with search
会员列表页面（`pages/members/members`）SHALL 展示所有会员，按最近上课时间倒序排列。每行显示头像、昵称、标签、最近上课日期、累计课程数。顶部搜索栏支持按昵称模糊搜索。

#### Scenario: Display member list
- **WHEN** 用户点击会员 Tab
- **THEN** 显示所有会员列表，最近活跃的排最前

#### Scenario: Search member by name
- **WHEN** 用户在搜索框输入"小"
- **THEN** 列表实时过滤，仅显示昵称包含"小"的会员

#### Scenario: Empty member list
- **WHEN** 没有任何会员数据
- **THEN** 显示空状态组件

### Requirement: Member list navigation
点击会员行 SHALL 导航到会员详情页。右上角"+"按钮 SHALL 导航到新增会员页。

#### Scenario: Navigate to member detail
- **WHEN** 用户点击某个会员行
- **THEN** 跳转到 `/pages/member-detail/member-detail?id=xxx`

#### Scenario: Navigate to add member
- **WHEN** 用户点击右上角"+"按钮
- **THEN** 跳转到 `/pages/member-edit/member-edit`（新增模式）

### Requirement: Member edit form
会员编辑页面（`pages/member-edit/member-edit`）SHALL 支持新增和编辑两种模式。表单字段：昵称（必填）、联系方式、标签（输入后回车添加）、备注。

#### Scenario: Create new member
- **WHEN** 用户导航到 `/pages/member-edit/member-edit`（无 id 参数）
- **THEN** 显示空白表单

#### Scenario: Edit existing member
- **WHEN** 用户导航到 `/pages/member-edit/member-edit?id=m_xxx`
- **THEN** 表单预填该会员现有数据

#### Scenario: Save member
- **WHEN** 用户填写昵称并点击保存
- **THEN** 数据写入 Storage，显示 Toast "保存成功" + 微振动，返回上一页

#### Scenario: Missing name validation
- **WHEN** 用户未填写昵称就点击保存
- **THEN** 显示 Toast "请输入会员昵称"

### Requirement: Member detail shows profile and statistics
会员详情页面（`pages/member-detail/member-detail`）顶部 SHALL 显示会员基本信息（头像、昵称、联系方式、标签、备注）。下方统计卡片 SHALL 显示：累计上课数、本月上课数、最近一次上课日期、最常上的课程类型。

#### Scenario: Display member stats
- **WHEN** 用户查看某会员详情
- **THEN** 统计卡片显示该会员的课程统计数据

#### Scenario: Navigate to edit member
- **WHEN** 用户点击顶部编辑按钮
- **THEN** 跳转到会员编辑页面

### Requirement: Member detail shows session timeline
会员详情页下方 SHALL 以时间轴形式展示该会员的所有课程记录，按时间倒序排列，按月份分组。每条记录显示日期、课程类型、地点、状态、训练重点、课后备注摘要。

#### Scenario: Display timeline
- **WHEN** 会员有多条课程记录
- **THEN** 按月分组显示时间轴，最近的月份在最上方

#### Scenario: Expand timeline record
- **WHEN** 用户点击时间轴中的某条记录
- **THEN** 展开显示完整课后备注和照片

#### Scenario: Collapse month group
- **WHEN** 用户点击某个月份的折叠/展开控件
- **THEN** 该月份的记录折叠或展开

#### Scenario: Empty timeline
- **WHEN** 该会员没有任何课程记录
- **THEN** 显示空状态提示"还没有上课记录"
