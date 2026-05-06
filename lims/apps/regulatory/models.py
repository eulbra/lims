from django.db import models
from django.utils.translation import gettext_lazy as _


class Jurisdiction(models.Model):
    """法规管辖层级: 联邦 / 州 / 市政"""

    class Level(models.TextChoices):
        FEDERAL = "federal", _("联邦")
        STATE = "state", _("州级")
        MUNICIPAL = "municipal", _("市级")

    name_cn = models.CharField(_("名称(中)"), max_length=100)
    name_en = models.CharField(_("名称(英)"), max_length=100, blank=True)
    name_pt = models.CharField(_("名称(葡)"), max_length=100, blank=True)
    level = models.CharField(_("层级"), max_length=20, choices=Level.choices, default=Level.FEDERAL)
    description_cn = models.TextField(_("描述(中)"), blank=True)

    class Meta:
        verbose_name = _("管辖层级")
        verbose_name_plural = _("管辖层级")
        ordering = ["level", "name_cn"]

    def __str__(self):
        return f"{self.name_cn} ({self.get_level_display()})"


class Category(models.Model):
    """法规分类: 公司法 / 税法 / 劳动法 / ANVISA临床实验室 / ANVISA医疗器械 等"""

    name_cn = models.CharField(_("分类名称(中)"), max_length=100)
    name_en = models.CharField(_("分类名称(英)"), max_length=100, blank=True)
    name_pt = models.CharField(_("分类名称(葡)"), max_length=100, blank=True)
    code = models.CharField(_("分类代码"), max_length=50, unique=True)
    description_cn = models.TextField(_("描述(中)"), blank=True)
    description_en = models.TextField(_("描述(英)"), blank=True)
    description_pt = models.TextField(_("描述(葡)"), blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
        verbose_name=_("父分类"),
    )
    sort_order = models.PositiveIntegerField(_("排序"), default=0)

    class Meta:
        verbose_name = _("法规分类")
        verbose_name_plural = _("法规分类")
        ordering = ["sort_order", "code"]

    def __str__(self):
        return self.name_cn


class Regulation(models.Model):
    """法规主体: 某一部具体的法律/法规/决议"""

    class Status(models.TextChoices):
        ACTIVE = "active", _("有效")
        AMENDED = "amended", _("已修订")
        REVOKED = "revoked", _("已废止")
        PENDING = "pending", _("待定/草案")

    class DocType(models.TextChoices):
        LAW = "law", _("法律(Lei)")
        DECREE = "decree", _("法令(Decreto)")
        PROVISIONAL_MEASURE = "mp", _("临时措施(Medida Provisória)")
        RDC = "rdc", _("ANVISA决议(RDC)")
        ORDINANCE = "ordinance", _("部令(Portaria)")
        NORMATIVE_INSTRUCTION = "ni", _("规范指令(IN)")
        RESOLUTION = "resolution", _("决议(Resolução)")
        CONSTITUTION = "constitution", _("宪法")
        INTERNATIONAL_TREATY = "treaty", _("国际条约")

    # 标识信息
    regulation_number = models.CharField(_("法规编号"), max_length=100, db_index=True)
    title_cn = models.CharField(_("标题(中)"), max_length=300)
    title_en = models.CharField(_("标题(英)"), max_length=300, blank=True)
    title_pt = models.CharField(_("标题(葡-原文)"), max_length=300)

    # 分类与管辖
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="regulations",
        verbose_name=_("所属分类"),
    )
    jurisdiction = models.ForeignKey(
        Jurisdiction,
        on_delete=models.PROTECT,
        related_name="regulations",
        verbose_name=_("管辖层级"),
        null=True,
        blank=True,
    )

    # 基本属性
    doc_type = models.CharField(_("文件类型"), max_length=30, choices=DocType.choices, default=DocType.LAW)
    issuing_authority_cn = models.CharField(_("发布机构(中)"), max_length=200)
    issuing_authority_en = models.CharField(_("发布机构(英)"), max_length=200, blank=True)
    issuing_authority_pt = models.CharField(_("发布机构(葡)"), max_length=200, blank=True)

    # 时间线
    published_date = models.DateField(_("发布日期"), null=True, blank=True)
    effective_date = models.DateField(_("生效日期"), null=True, blank=True)
    revoked_date = models.DateField(_("废止日期"), null=True, blank=True)

    # 状态
    status = models.CharField(_("状态"), max_length=20, choices=Status.choices, default=Status.ACTIVE)

    # 内容摘要 (多语言)
    summary_cn = models.TextField(_("摘要(中)"), blank=True)
    summary_en = models.TextField(_("摘要(英)"), blank=True)
    summary_pt = models.TextField(_("摘要(葡)"), blank=True)

    # 完整文本 (大字段，允许存储长篇法规)
    full_text_cn = models.TextField(_("全文(中)"), blank=True)
    full_text_en = models.TextField(_("全文(英)"), blank=True)
    full_text_pt = models.TextField(_("全文(葡-原文)"), blank=True)

    # 链接与附件
    official_link = models.URLField(_("官方链接"), blank=True)
    pdf_url = models.URLField(_("PDF链接"), blank=True)

    # 检索标签
    keywords_cn = models.CharField(_("关键词(中)"), max_length=500, blank=True, help_text=_("逗号分隔"))
    keywords_en = models.CharField(_("关键词(英)"), max_length=500, blank=True)
    keywords_pt = models.CharField(_("关键词(葡)"), max_length=500, blank=True)

    # 关联法规
    related_regulations = models.ManyToManyField(
        "self",
        symmetrical=True,
        blank=True,
        verbose_name=_("关联法规"),
    )
    amends = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="amended_by",
        verbose_name=_("修订/替代"),
    )

    # 系统字段
    created_at = models.DateTimeField(_("创建时间"), auto_now_add=True)
    updated_at = models.DateTimeField(_("更新时间"), auto_now=True)
    remark = models.TextField(_("备注"), blank=True)

    class Meta:
        verbose_name = _("法规")
        verbose_name_plural = _("法规")
        ordering = ["-effective_date", "regulation_number"]
        indexes = [
            models.Index(fields=["category", "status"]),
            models.Index(fields=["doc_type", "status"]),
            models.Index(fields=["keywords_cn"], name="idx_kw_cn"),
        ]

    def __str__(self):
        return f"{self.regulation_number} - {self.title_cn}"


class RegulationArticle(models.Model):
    """
    法规条款/章节
    用于拆分大型法规为可检索的条款级粒度
    """

    regulation = models.ForeignKey(
        Regulation,
        on_delete=models.CASCADE,
        related_name="articles",
        verbose_name=_("所属法规"),
    )
    parent_article = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="sub_articles",
        verbose_name=_("父条款"),
    )

    article_number = models.CharField(_("条款编号"), max_length=50, blank=True)
    title_cn = models.CharField(_("条款标题(中)"), max_length=300, blank=True)
    title_en = models.CharField(_("条款标题(英)"), max_length=300, blank=True)
    title_pt = models.CharField(_("条款标题(葡)"), max_length=300, blank=True)

    content_cn = models.TextField(_("条款内容(中)"), blank=True)
    content_en = models.TextField(_("条款内容(英)"), blank=True)
    content_pt = models.TextField(_("条款内容(葡-原文)"), blank=True)

    sort_order = models.PositiveIntegerField(_("排序"), default=0)

    # 标签: 用于条款级检索
    tags_cn = models.CharField(_("标签(中)"), max_length=300, blank=True)

    class Meta:
        verbose_name = _("法规条款")
        verbose_name_plural = _("法规条款")
        ordering = ["regulation", "sort_order", "article_number"]

    def __str__(self):
        return f"{self.regulation.regulation_number} 第{self.article_number}条 - {self.title_cn or ''}"


class RegulatoryQALog(models.Model):
    """
    法规查询日志: 记录用户对某个法规问题的查询及AI/人工回答
    用于知识积累和快速复用
    """

    question_cn = models.TextField(_("问题(中)"))
    question_en = models.TextField(_("问题(英)"), blank=True)
    question_pt = models.TextField(_("问题(葡)"), blank=True)

    # 关联的法规/条款
    referenced_regulations = models.ManyToManyField(
        Regulation,
        blank=True,
        verbose_name=_("引用法规"),
    )
    referenced_articles = models.ManyToManyField(
        RegulationArticle,
        blank=True,
        verbose_name=_("引用条款"),
    )

    # 回答
    answer_cn = models.TextField(_("回答(中)"))
    answer_en = models.TextField(_("回答(英)"), blank=True)
    answer_pt = models.TextField(_("回答(葡)"), blank=True)

    # 回答来源
    source = models.CharField(_("回答来源"), max_length=50, default="manual")
    confidence = models.CharField(_("可信度"), max_length=20, blank=True)

    # 使用统计
    view_count = models.PositiveIntegerField(_("查看次数"), default=0)
    helpful_count = models.PositiveIntegerField(_("有用投票"), default=0)

    created_at = models.DateTimeField(_("创建时间"), auto_now_add=True)
    updated_at = models.DateTimeField(_("更新时间"), auto_now=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("创建者"),
    )

    class Meta:
        verbose_name = _("法规问答记录")
        verbose_name_plural = _("法规问答记录")
        ordering = ["-created_at"]

    def __str__(self):
        return self.question_cn[:80]
