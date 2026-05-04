/**
 * Applies fully translated planner.shell + planner.core to non-TR/EN locales,
 * removes planner.core.months/weekdays (calendar uses Intl in PlannerClient),
 * and syncs yearlyWorkPlan.months to short Intl labels for table/PDF headers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");

/** @type {Record<string, { shell: object; core: object }>} */
const PACK = {
  ru: {
    shell: {
      title: "Планировщик",
      description:
        "Задачи по ОТ, годовой план работ, план обучения и учёт времени в одном месте.",
      tabs: {
        planner: {
          label: "Планировщик",
          desc: "Календарь, задачи и напоминания",
        },
        workPlan: {
          label: "Годовой план работ",
          desc: "Годовой план работ по охране труда (официальная форма)",
        },
        trainingPlan: {
          label: "Годовое обучение",
          desc: "План обучения, участники и сертификаты",
        },
        timesheet: {
          label: "Учёт времени",
          desc: "Учёт часов и оплаты",
        },
      },
    },
    core: {
      pageTitle: "Планировщик ОТ",
      pageDescription: "Планируйте и отслеживайте задачи по охране труда.",
      actions: {
        newTask: "Новая задача",
        dismissError: "Скрыть ошибку",
        cancel: "Отмена",
        saving: "Сохранение…",
        create: "Создать",
        update: "Обновить",
      },
      stats: { total: "Всего" },
      filters: {
        allCategories: "Все категории",
        allStatuses: "Все статусы",
        allCompanies: "Все компании",
      },
      views: { month: "Календарь", list: "Список" },
      sidebar: {
        categories: "Категории",
        all: "Все",
        addCategory: "Добавить категорию",
        quickAdd: "Быстрое добавление",
      },
      calendar: { more: "+{count} ещё" },
      empty: {
        title: "Пока нет задач",
        description: "Нажмите кнопку «Новая задача» выше.",
      },
      recurrence: {
        none: "Не повторяется",
        daily: "Ежедневно",
        weekly: "Еженедельно",
        monthly: "Ежемесячно",
        quarterly: "Ежеквартально",
        biannual: "Раз в полгода",
        annual: "Ежегодно",
      },
      status: {
        planned: "Запланировано",
        in_progress: "В работе",
        completed: "Завершено",
        overdue: "Просрочено",
        cancelled: "Отменено",
      },
      categories: {
        periodicControl: "Периодический контроль",
        training: "Обучение",
        healthFollowUp: "Медицинское наблюдение",
        meetingDrill: "Совещания и учения",
        legalObligation: "Законодательные обязательства",
        fieldVisit: "Выезд на объект",
        ohsCommitteeMeeting: "Заседание комитета по ОТ",
        other: "Прочее",
      },
      modal: {
        newTitle: "Новая задача",
        editTitle: "Изменить задачу",
        optional: "— необязательно",
        fields: {
          title: "Название *",
          description: "Описание",
          category: "Категория",
          status: "Статус",
          company: "Компания",
          startDate: "Дата начала *",
          endDate: "Дата окончания",
          recurrence: "Повтор",
          reminderDays: "Напоминание (за сколько дней)",
          includeTimesheet: "Добавить в учёт времени",
          timesheetHours: "Рабочее время (часы)",
          hourlyRate: "Почасовая ставка",
        },
        placeholders: {
          title: "Название задачи",
          description: "Описание задачи…",
          category: "Выберите категорию…",
          company: "Выберите компанию…",
          hours: "напр. 4,5",
          rate: "напр. 250",
        },
      },
      errors: {
        orgNotFound: "Информация об организации не найдена. Войдите снова.",
        saveFailed: "При сохранении произошла ошибка.",
      },
      confirmDeleteTask: "Удалить эту задачу?",
    },
  },
  ar: {
    shell: {
      title: "المخطط",
      description:
        "مهام الصحة والسلامة المهنية، وخطة العمل السنوية، وخطة التدريب، وسجل الساعات في مكان واحد.",
      tabs: {
        planner: {
          label: "المخطط",
          desc: "التقويم والمهام والتذكيرات",
        },
        workPlan: {
          label: "خطة العمل السنوية",
          desc: "خطة العمل السنوية للصحة والسلامة المهنية (نموذج رسمي)",
        },
        trainingPlan: {
          label: "التدريب السنوي",
          desc: "خطة التدريب والمشاركون والشهادات",
        },
        timesheet: {
          label: "سجل الساعات",
          desc: "تتبع الساعات والأتعاب",
        },
      },
    },
    core: {
      pageTitle: "مخطط الصحة والسلامة المهنية",
      pageDescription: "خطط مهام الصحة والسلامة المهنية وتابعها.",
      actions: {
        newTask: "مهمة جديدة",
        dismissError: "إغلاق التنبيه",
        cancel: "إلغاء",
        saving: "جاري الحفظ…",
        create: "إنشاء",
        update: "تحديث",
      },
      stats: { total: "الإجمالي" },
      filters: {
        allCategories: "كل الفئات",
        allStatuses: "كل الحالات",
        allCompanies: "كل الشركات",
      },
      views: { month: "التقويم", list: "القائمة" },
      sidebar: {
        categories: "الفئات",
        all: "الكل",
        addCategory: "إضافة فئة",
        quickAdd: "إضافة سريعة",
      },
      calendar: { more: "+{count} أخرى" },
      empty: {
        title: "لا توجد مهام بعد",
        description: "اضغط زر «مهمة جديدة» أعلاه.",
      },
      recurrence: {
        none: "بدون تكرار",
        daily: "يوميًا",
        weekly: "أسبوعيًا",
        monthly: "شهريًا",
        quarterly: "كل ربع سنة",
        biannual: "كل ستة أشهر",
        annual: "سنويًا",
      },
      status: {
        planned: "مخطط",
        in_progress: "قيد التنفيذ",
        completed: "مكتمل",
        overdue: "متأخر",
        cancelled: "ملغى",
      },
      categories: {
        periodicControl: "تفتيش دوري",
        training: "تدريب",
        healthFollowUp: "متابعة صحية",
        meetingDrill: "اجتماع وطوارئ",
        legalObligation: "التزام قانوني",
        fieldVisit: "زيارة ميدانية",
        ohsCommitteeMeeting: "اجتماع لجنة الصحة والسلامة",
        other: "أخرى",
      },
      modal: {
        newTitle: "مهمة جديدة",
        editTitle: "تعديل المهمة",
        optional: "- اختياري",
        fields: {
          title: "العنوان *",
          description: "الوصف",
          category: "الفئة",
          status: "الحالة",
          company: "الشركة",
          startDate: "تاريخ البدء *",
          endDate: "تاريخ الانتهاء",
          recurrence: "التكرار",
          reminderDays: "تذكير (قبل كم يومًا)",
          includeTimesheet: "إضافة إلى سجل الساعات",
          timesheetHours: "وقت العمل (ساعات)",
          hourlyRate: "الأجر بالساعة",
        },
        placeholders: {
          title: "عنوان المهمة",
          description: "وصف المهمة…",
          category: "اختر الفئة…",
          company: "اختر الشركة…",
          hours: "مثال: 4.5",
          rate: "مثال: 250",
        },
      },
      errors: {
        orgNotFound: "معلومات المؤسسة غير موجودة. يرجى تسجيل الدخول مرة أخرى.",
        saveFailed: "حدث خطأ أثناء الحفظ.",
      },
      confirmDeleteTask: "هل تريد بالتأكيد حذف هذه المهمة؟",
    },
  },
  de: {
    shell: {
      title: "Planer",
      description:
        "AMS-Aufgaben, Jahresarbeitsplan, Schulungsplan und Stundenerfassung an einem Ort.",
      tabs: {
        planner: {
          label: "Planer",
          desc: "Kalender, Aufgaben und Erinnerungen",
        },
        workPlan: {
          label: "Jahresarbeitsplan",
          desc: "Offizieller AMS-Jahresarbeitsplan",
        },
        trainingPlan: {
          label: "Jahresschulung",
          desc: "Schulungsplan, Teilnehmende und Zertifikate",
        },
        timesheet: {
          label: "Stundenerfassung",
          desc: "Stunden- und Honorarverfolgung",
        },
      },
    },
    core: {
      pageTitle: "AMS-Planer",
      pageDescription: "Arbeitsschutzaufgaben planen und nachverfolgen.",
      actions: {
        newTask: "Neue Aufgabe",
        dismissError: "Meldung schließen",
        cancel: "Abbrechen",
        saving: "Wird gespeichert…",
        create: "Anlegen",
        update: "Aktualisieren",
      },
      stats: { total: "Gesamt" },
      filters: {
        allCategories: "Alle Kategorien",
        allStatuses: "Alle Status",
        allCompanies: "Alle Unternehmen",
      },
      views: { month: "Kalender", list: "Liste" },
      sidebar: {
        categories: "Kategorien",
        all: "Alle",
        addCategory: "Kategorie hinzufügen",
        quickAdd: "Schnell hinzufügen",
      },
      calendar: { more: "+{count} weitere" },
      empty: {
        title: "Noch keine Aufgaben",
        description: "Klicken Sie oben auf «Neue Aufgabe».",
      },
      recurrence: {
        none: "Ohne Wiederholung",
        daily: "Täglich",
        weekly: "Wöchentlich",
        monthly: "Monatlich",
        quarterly: "Vierteljährlich",
        biannual: "Halbjährlich",
        annual: "Jährlich",
      },
      status: {
        planned: "Geplant",
        in_progress: "In Bearbeitung",
        completed: "Erledigt",
        overdue: "Überfällig",
        cancelled: "Abgebrochen",
      },
      categories: {
        periodicControl: "Periodische Prüfung",
        training: "Schulung",
        healthFollowUp: "Gesundheitliche Nachbetreuung",
        meetingDrill: "Besprechung & Übung",
        legalObligation: "Gesetzliche Pflicht",
        fieldVisit: "Begehung vor Ort",
        ohsCommitteeMeeting: "ASR-Ausschusssitzung",
        other: "Sonstiges",
      },
      modal: {
        newTitle: "Neue Aufgabe",
        editTitle: "Aufgabe bearbeiten",
        optional: "– optional",
        fields: {
          title: "Titel *",
          description: "Beschreibung",
          category: "Kategorie",
          status: "Status",
          company: "Unternehmen",
          startDate: "Startdatum *",
          endDate: "Enddatum",
          recurrence: "Wiederholung",
          reminderDays: "Erinnerung (Tage vorher)",
          includeTimesheet: "In Stundenerfassung aufnehmen",
          timesheetHours: "Arbeitszeit (Stunden)",
          hourlyRate: "Stundensatz",
        },
        placeholders: {
          title: "Aufgabentitel",
          description: "Aufgabenbeschreibung…",
          category: "Kategorie wählen…",
          company: "Unternehmen wählen…",
          hours: "z. B. 4,5",
          rate: "z. B. 250",
        },
      },
      errors: {
        orgNotFound: "Organisationsdaten nicht gefunden. Bitte erneut anmelden.",
        saveFailed: "Beim Speichern ist ein Fehler aufgetreten.",
      },
      confirmDeleteTask: "Diese Aufgabe wirklich löschen?",
    },
  },
  fr: {
    shell: {
      title: "Planificateur",
      description:
        "Tâches SST, plan d’action annuel, plan de formation et relevé d’heures au même endroit.",
      tabs: {
        planner: {
          label: "Planificateur",
          desc: "Calendrier, tâches et rappels",
        },
        workPlan: {
          label: "Plan d’action annuel",
          desc: "Plan d’action SST annuel (formulaire officiel)",
        },
        trainingPlan: {
          label: "Formation annuelle",
          desc: "Plan de formation, participants et certificats",
        },
        timesheet: {
          label: "Relevé d’heures",
          desc: "Suivi des heures et des honoraires",
        },
      },
    },
    core: {
      pageTitle: "Planificateur SST",
      pageDescription: "Planifiez et suivez les tâches de santé et sécurité au travail.",
      actions: {
        newTask: "Nouvelle tâche",
        dismissError: "Fermer l’alerte",
        cancel: "Annuler",
        saving: "Enregistrement…",
        create: "Créer",
        update: "Mettre à jour",
      },
      stats: { total: "Total" },
      filters: {
        allCategories: "Toutes les catégories",
        allStatuses: "Tous les statuts",
        allCompanies: "Toutes les entreprises",
      },
      views: { month: "Calendrier", list: "Liste" },
      sidebar: {
        categories: "Catégories",
        all: "Tout",
        addCategory: "Ajouter une catégorie",
        quickAdd: "Ajout rapide",
      },
      calendar: { more: "+{count} de plus" },
      empty: {
        title: "Aucune tâche pour l’instant",
        description: "Cliquez sur le bouton « Nouvelle tâche » ci-dessus.",
      },
      recurrence: {
        none: "Ne se répète pas",
        daily: "Quotidien",
        weekly: "Hebdomadaire",
        monthly: "Mensuel",
        quarterly: "Trimestriel",
        biannual: "Semestriel",
        annual: "Annuel",
      },
      status: {
        planned: "Planifié",
        in_progress: "En cours",
        completed: "Terminé",
        overdue: "En retard",
        cancelled: "Annulé",
      },
      categories: {
        periodicControl: "Contrôle périodique",
        training: "Formation",
        healthFollowUp: "Suivi de santé",
        meetingDrill: "Réunion et exercice",
        legalObligation: "Obligation légale",
        fieldVisit: "Visite sur site",
        ohsCommitteeMeeting: "Réunion du comité SST",
        other: "Autre",
      },
      modal: {
        newTitle: "Nouvelle tâche",
        editTitle: "Modifier la tâche",
        optional: "— facultatif",
        fields: {
          title: "Titre *",
          description: "Description",
          category: "Catégorie",
          status: "Statut",
          company: "Entreprise",
          startDate: "Date de début *",
          endDate: "Date de fin",
          recurrence: "Répétition",
          reminderDays: "Rappel (jours avant)",
          includeTimesheet: "Ajouter au relevé d’heures",
          timesheetHours: "Temps de travail (heures)",
          hourlyRate: "Taux horaire",
        },
        placeholders: {
          title: "Titre de la tâche",
          description: "Description de la tâche…",
          category: "Choisir une catégorie…",
          company: "Choisir une entreprise…",
          hours: "ex. 4,5",
          rate: "ex. 250",
        },
      },
      errors: {
        orgNotFound: "Informations sur l’organisation introuvables. Veuillez vous reconnecter.",
        saveFailed: "Une erreur s’est produite lors de l’enregistrement.",
      },
      confirmDeleteTask: "Voulez-vous vraiment supprimer cette tâche ?",
    },
  },
  es: {
    shell: {
      title: "Planificador",
      description:
        "Tareas de PRL, plan anual de trabajo, plan de formación y parte de horas en un solo lugar.",
      tabs: {
        planner: {
          label: "Planificador",
          desc: "Calendario, tareas y recordatorios",
        },
        workPlan: {
          label: "Plan anual de trabajo",
          desc: "Plan anual de trabajo de PRL (formulario oficial)",
        },
        trainingPlan: {
          label: "Formación anual",
          desc: "Plan de formación, participantes y certificados",
        },
        timesheet: {
          label: "Parte de horas",
          desc: "Seguimiento de horas y honorarios",
        },
      },
    },
    core: {
      pageTitle: "Planificador de PRL",
      pageDescription: "Planifica y haz seguimiento de las tareas de prevención.",
      actions: {
        newTask: "Nueva tarea",
        dismissError: "Cerrar aviso",
        cancel: "Cancelar",
        saving: "Guardando…",
        create: "Crear",
        update: "Actualizar",
      },
      stats: { total: "Total" },
      filters: {
        allCategories: "Todas las categorías",
        allStatuses: "Todos los estados",
        allCompanies: "Todas las empresas",
      },
      views: { month: "Calendario", list: "Lista" },
      sidebar: {
        categories: "Categorías",
        all: "Todas",
        addCategory: "Añadir categoría",
        quickAdd: "Añadir rápido",
      },
      calendar: { more: "+{count} más" },
      empty: {
        title: "Aún no hay tareas",
        description: "Pulsa el botón «Nueva tarea» de arriba.",
      },
      recurrence: {
        none: "No se repite",
        daily: "Diaria",
        weekly: "Semanal",
        monthly: "Mensual",
        quarterly: "Trimestral",
        biannual: "Semestral",
        annual: "Anual",
      },
      status: {
        planned: "Planificada",
        in_progress: "En curso",
        completed: "Completada",
        overdue: "Atrasada",
        cancelled: "Cancelada",
      },
      categories: {
        periodicControl: "Inspección periódica",
        training: "Formación",
        healthFollowUp: "Seguimiento de salud",
        meetingDrill: "Reunión y simulacro",
        legalObligation: "Obligación legal",
        fieldVisit: "Visita de campo",
        ohsCommitteeMeeting: "Reunión del comité de PRL",
        other: "Otra",
      },
      modal: {
        newTitle: "Nueva tarea",
        editTitle: "Editar tarea",
        optional: "- opcional",
        fields: {
          title: "Título *",
          description: "Descripción",
          category: "Categoría",
          status: "Estado",
          company: "Empresa",
          startDate: "Fecha de inicio *",
          endDate: "Fecha de fin",
          recurrence: "Repetición",
          reminderDays: "Recordatorio (días antes)",
          includeTimesheet: "Añadir al parte de horas",
          timesheetHours: "Tiempo de trabajo (horas)",
          hourlyRate: "Tarifa por hora",
        },
        placeholders: {
          title: "Título de la tarea",
          description: "Descripción de la tarea…",
          category: "Seleccione categoría…",
          company: "Seleccione empresa…",
          hours: "p. ej. 4,5",
          rate: "p. ej. 250",
        },
      },
      errors: {
        orgNotFound: "No se encontró la información de la organización. Vuelva a iniciar sesión.",
        saveFailed: "Se produjo un error al guardar.",
      },
      confirmDeleteTask: "¿Seguro que desea eliminar esta tarea?",
    },
  },
  zh: {
    shell: {
      title: "规划器",
      description: "职业健康安全任务、年度工作计划、培训计划和工时表集中在一处。",
      tabs: {
        planner: { label: "规划器", desc: "日历、任务和提醒" },
        workPlan: { label: "年度工作计划", desc: "职业健康安全年度工作计划（正式表格）" },
        trainingPlan: { label: "年度培训", desc: "培训计划、参与者与证书" },
        timesheet: { label: "工时表", desc: "工时与费用跟踪" },
      },
    },
    core: {
      pageTitle: "职业健康安全规划器",
      pageDescription: "规划并跟踪职业健康与安全任务。",
      actions: {
        newTask: "新建任务",
        dismissError: "关闭提示",
        cancel: "取消",
        saving: "正在保存…",
        create: "创建",
        update: "更新",
      },
      stats: { total: "合计" },
      filters: {
        allCategories: "所有类别",
        allStatuses: "所有状态",
        allCompanies: "所有公司",
      },
      views: { month: "日历", list: "列表" },
      sidebar: {
        categories: "类别",
        all: "全部",
        addCategory: "添加类别",
        quickAdd: "快速添加",
      },
      calendar: { more: "还有 {count} 项" },
      empty: { title: "尚无任务", description: "请点击上方的「新建任务」按钮。" },
      recurrence: {
        none: "不重复",
        daily: "每天",
        weekly: "每周",
        monthly: "每月",
        quarterly: "每季度",
        biannual: "每半年",
        annual: "每年",
      },
      status: {
        planned: "已计划",
        in_progress: "进行中",
        completed: "已完成",
        overdue: "已逾期",
        cancelled: "已取消",
      },
      categories: {
        periodicControl: "定期检查",
        training: "培训",
        healthFollowUp: "健康随访",
        meetingDrill: "会议与演练",
        legalObligation: "法定义务",
        fieldVisit: "现场访问",
        ohsCommitteeMeeting: "职业健康安全委员会会议",
        other: "其他",
      },
      modal: {
        newTitle: "新建任务",
        editTitle: "编辑任务",
        optional: "- 可选",
        fields: {
          title: "标题 *",
          description: "说明",
          category: "类别",
          status: "状态",
          company: "公司",
          startDate: "开始日期 *",
          endDate: "结束日期",
          recurrence: "重复",
          reminderDays: "提醒（提前天数）",
          includeTimesheet: "加入工时表",
          timesheetHours: "工作时间（小时）",
          hourlyRate: "小时费率",
        },
        placeholders: {
          title: "任务标题",
          description: "任务说明…",
          category: "选择类别…",
          company: "选择公司…",
          hours: "例如 4.5",
          rate: "例如 250",
        },
      },
      errors: {
        orgNotFound: "未找到组织信息，请重新登录。",
        saveFailed: "保存时出错。",
      },
      confirmDeleteTask: "确定要删除此任务吗？",
    },
  },
  ja: {
    shell: {
      title: "プランナー",
      description:
        "産業保健・安全のタスク、年間作業計画、研修計画、タイムシートを一か所で管理します。",
      tabs: {
        planner: { label: "プランナー", desc: "カレンダー、タスク、リマインダー" },
        workPlan: { label: "年間作業計画", desc: "産業安全衛生の年間作業計画（正式様式）" },
        trainingPlan: { label: "年間研修", desc: "研修計画、受講者、証明書" },
        timesheet: { label: "タイムシート", desc: "時間と料金の記録" },
      },
    },
    core: {
      pageTitle: "安全衛生プランナー",
      pageDescription: "安全衛生タスクを計画し、進捗を追跡します。",
      actions: {
        newTask: "新しいタスク",
        dismissError: "通知を閉じる",
        cancel: "キャンセル",
        saving: "保存中…",
        create: "作成",
        update: "更新",
      },
      stats: { total: "合計" },
      filters: {
        allCategories: "すべてのカテゴリ",
        allStatuses: "すべてのステータス",
        allCompanies: "すべての会社",
      },
      views: { month: "カレンダー", list: "リスト" },
      sidebar: {
        categories: "カテゴリ",
        all: "すべて",
        addCategory: "カテゴリを追加",
        quickAdd: "クイック追加",
      },
      calendar: { more: "他 {count} 件" },
      empty: {
        title: "タスクはまだありません",
        description: "上の「新しいタスク」ボタンをクリックしてください。",
      },
      recurrence: {
        none: "繰り返さない",
        daily: "毎日",
        weekly: "毎週",
        monthly: "毎月",
        quarterly: "四半期ごと",
        biannual: "半年ごと",
        annual: "毎年",
      },
      status: {
        planned: "予定",
        in_progress: "進行中",
        completed: "完了",
        overdue: "期限超過",
        cancelled: "取消し",
      },
      categories: {
        periodicControl: "定期検査",
        training: "研修",
        healthFollowUp: "健康フォロー",
        meetingDrill: "会議・訓練",
        legalObligation: "法的義務",
        fieldVisit: "現場巡回",
        ohsCommitteeMeeting: "安全衛生委員会",
        other: "その他",
      },
      modal: {
        newTitle: "新しいタスク",
        editTitle: "タスクを編集",
        optional: "— 任意",
        fields: {
          title: "タイトル *",
          description: "説明",
          category: "カテゴリ",
          status: "ステータス",
          company: "会社",
          startDate: "開始日 *",
          endDate: "終了日",
          recurrence: "繰り返し",
          reminderDays: "リマインダー（何日前）",
          includeTimesheet: "タイムシートに追加",
          timesheetHours: "作業時間（時間）",
          hourlyRate: "時間単価",
        },
        placeholders: {
          title: "タスクのタイトル",
          description: "タスクの説明…",
          category: "カテゴリを選択…",
          company: "会社を選択…",
          hours: "例: 4.5",
          rate: "例: 250",
        },
      },
      errors: {
        orgNotFound: "組織情報が見つかりません。再度ログインしてください。",
        saveFailed: "保存中にエラーが発生しました。",
      },
      confirmDeleteTask: "このタスクを削除してもよろしいですか？",
    },
  },
  ko: {
    shell: {
      title: "플래너",
      description:
        "산업안전보건 업무, 연간 작업계획, 교육계획, 타임시트를 한곳에서 관리합니다.",
      tabs: {
        planner: { label: "플래너", desc: "캘린더, 작업, 알림" },
        workPlan: { label: "연간 작업계획", desc: "산업안전보건 연간 작업계획(공식 서식)" },
        trainingPlan: { label: "연간 교육", desc: "교육 계획, 참가자 및 증명서" },
        timesheet: { label: "타임시트", desc: "시간 및 비용 추적" },
      },
    },
    core: {
      pageTitle: "산업안전보건 플래너",
      pageDescription: "산업안전보건 작업을 계획하고 추적합니다.",
      actions: {
        newTask: "새 작업",
        dismissError: "오류 닫기",
        cancel: "취소",
        saving: "저장 중…",
        create: "만들기",
        update: "업데이트",
      },
      stats: { total: "합계" },
      filters: {
        allCategories: "모든 범주",
        allStatuses: "모든 상태",
        allCompanies: "모든 회사",
      },
      views: { month: "캘린더", list: "목록" },
      sidebar: {
        categories: "범주",
        all: "전체",
        addCategory: "범주 추가",
        quickAdd: "빠른 추가",
      },
      calendar: { more: "+{count}개 더" },
      empty: {
        title: "아직 작업이 없습니다",
        description: "위의 «새 작업» 버튼을 클릭하세요.",
      },
      recurrence: {
        none: "반복 없음",
        daily: "매일",
        weekly: "매주",
        monthly: "매월",
        quarterly: "분기별",
        biannual: "반기별",
        annual: "매년",
      },
      status: {
        planned: "계획됨",
        in_progress: "진행 중",
        completed: "완료",
        overdue: "기한 초과",
        cancelled: "취소됨",
      },
      categories: {
        periodicControl: "정기 점검",
        training: "교육",
        healthFollowUp: "건강 관리",
        meetingDrill: "회의 및 훈련",
        legalObligation: "법적 의무",
        fieldVisit: "현장 방문",
        ohsCommitteeMeeting: "산업안전보건 위원회",
        other: "기타",
      },
      modal: {
        newTitle: "새 작업",
        editTitle: "작업 편집",
        optional: "- 선택",
        fields: {
          title: "제목 *",
          description: "설명",
          category: "범주",
          status: "상태",
          company: "회사",
          startDate: "시작일 *",
          endDate: "종료일",
          recurrence: "반복",
          reminderDays: "알림(며칠 전)",
          includeTimesheet: "타임시트에 추가",
          timesheetHours: "근무 시간(시간)",
          hourlyRate: "시간당 요금",
        },
        placeholders: {
          title: "작업 제목",
          description: "작업 설명…",
          category: "범주 선택…",
          company: "회사 선택…",
          hours: "예: 4.5",
          rate: "예: 250",
        },
      },
      errors: {
        orgNotFound: "조직 정보를 찾을 수 없습니다. 다시 로그인하세요.",
        saveFailed: "저장 중 오류가 발생했습니다.",
      },
      confirmDeleteTask: "이 작업을 삭제할까요?",
    },
  },
  hi: {
    shell: {
      title: "योजनाकार",
      description:
        "ओएचएस कार्य, वार्षिक कार्य योजना, प्रशिक्षण योजना और समय पत्र एक ही स्थान पर।",
      tabs: {
        planner: { label: "योजनाकार", desc: "कैलेंडर, कार्य और अनुस्मारक" },
        workPlan: { label: "वार्षिक कार्य योजना", desc: "ओएचएस वार्षिक कार्य योजना (आधिकारिक प्रपत्र)" },
        trainingPlan: { label: "वार्षिक प्रशिक्षण", desc: "प्रशिक्षण योजना, प्रतिभागी और प्रमाणपत्र" },
        timesheet: { label: "समय पत्र", desc: "घंटों और शुल्क का ट्रैकिंग" },
      },
    },
    core: {
      pageTitle: "ओएचएस योजनाकार",
      pageDescription: "औद्योगिक स्वास्थ्य और सुरक्षा कार्यों की योजना और ट्रैकिंग करें।",
      actions: {
        newTask: "नया कार्य",
        dismissError: "त्रुटि बंद करें",
        cancel: "रद्द करें",
        saving: "सहेजा जा रहा है…",
        create: "बनाएँ",
        update: "अपडेट करें",
      },
      stats: { total: "कुल" },
      filters: {
        allCategories: "सभी श्रेणियाँ",
        allStatuses: "सभी स्थितियाँ",
        allCompanies: "सभी कंपनियाँ",
      },
      views: { month: "कैलेंडर", list: "सूची" },
      sidebar: {
        categories: "श्रेणियाँ",
        all: "सभी",
        addCategory: "श्रेणी जोड़ें",
        quickAdd: "त्वरित जोड़",
      },
      calendar: { more: "+{count} और" },
      empty: {
        title: "अभी तक कोई कार्य नहीं",
        description: "ऊपर «नया कार्य» बटन दबाएँ।",
      },
      recurrence: {
        none: "दोहराव नहीं",
        daily: "दैनिक",
        weekly: "साप्ताहिक",
        monthly: "मासिक",
        quarterly: "त्रैमासिक",
        biannual: "छमाही",
        annual: "वार्षिक",
      },
      status: {
        planned: "नियोजित",
        in_progress: "प्रगति पर",
        completed: "पूर्ण",
        overdue: "अतिदेय",
        cancelled: "रद्द",
      },
      categories: {
        periodicControl: "आवधिक निरीक्षण",
        training: "प्रशिक्षण",
        healthFollowUp: "स्वास्थ्य अनुवर्ती",
        meetingDrill: "बैठक और मॉकड्रिल",
        legalObligation: "कानूनी दायित्व",
        fieldVisit: "क्षेत्र भ्रमण",
        ohsCommitteeMeeting: "ओएचएस समिति बैठक",
        other: "अन्य",
      },
      modal: {
        newTitle: "नया कार्य",
        editTitle: "कार्य संपादित करें",
        optional: "- वैकल्पिक",
        fields: {
          title: "शीर्षक *",
          description: "विवरण",
          category: "श्रेणी",
          status: "स्थिति",
          company: "कंपनी",
          startDate: "प्रारंभ तिथि *",
          endDate: "समाप्ति तिथि",
          recurrence: "दोहराव",
          reminderDays: "अनुस्मारक (कितने दिन पहले)",
          includeTimesheet: "समय पत्र में जोड़ें",
          timesheetHours: "कार्य समय (घंटे)",
          hourlyRate: "प्रति घंटा दर",
        },
        placeholders: {
          title: "कार्य शीर्षक",
          description: "कार्य विवरण…",
          category: "श्रेणी चुनें…",
          company: "कंपनी चुनें…",
          hours: "उदा. 4.5",
          rate: "उदा. 250",
        },
      },
      errors: {
        orgNotFound: "संगठन की जानकारी नहीं मिली। कृपया पुनः लॉग इन करें।",
        saveFailed: "सहेजते समय एक त्रुटि हुई।",
      },
      confirmDeleteTask: "क्या आप वाकई इस कार्य को हटाना चाहते हैं?",
    },
  },
  az: {
    shell: {
      title: "Planlayıcı",
      description:
        "İSG tapşırıqları, illik iş planı, tədris planı və tabelyer bir yerdə.",
      tabs: {
        planner: { label: "Planlayıcı", desc: "Təqvim, tapşırıqlar və xatırlatmalar" },
        workPlan: { label: "İllik iş planı", desc: "İSG illik iş planı (rəsmi forma)" },
        trainingPlan: { label: "İllik tədris", desc: "Tədris planı, iştirakçılar və sertifikatlar" },
        timesheet: { label: "Tabelyer", desc: "Saat və ödəniş izləməsi" },
      },
    },
    core: {
      pageTitle: "İSG planlayıcısı",
      pageDescription: "İş təhlükəsizliyi tapşırıqlarını planlayın və izləyin.",
      actions: {
        newTask: "Yeni tapşırıq",
        dismissError: "Xətanı bağla",
        cancel: "Ləğv et",
        saving: "Saxlanılır…",
        create: "Yarat",
        update: "Yenilə",
      },
      stats: { total: "Cəmi" },
      filters: {
        allCategories: "Bütün kateqoriyalar",
        allStatuses: "Bütün statuslar",
        allCompanies: "Bütün şirkətlər",
      },
      views: { month: "Təqvim", list: "Siyahı" },
      sidebar: {
        categories: "Kateqoriyalar",
        all: "Hamısı",
        addCategory: "Kateqoriya əlavə et",
        quickAdd: "Sürətli əlavə",
      },
      calendar: { more: "+{count} daha" },
      empty: {
        title: "Hələ tapşırıq yoxdur",
        description: "Yuxarıdakı «Yeni tapşırıq» düyməsinə basın.",
      },
      recurrence: {
        none: "Təkrarlanmır",
        daily: "Günlük",
        weekly: "Həftəlik",
        monthly: "Aylıq",
        quarterly: "Rüblük",
        biannual: "Altı aylıq",
        annual: "İllik",
      },
      status: {
        planned: "Planlaşdırılıb",
        in_progress: "Davam edir",
        completed: "Tamamlanıb",
        overdue: "Gecikmiş",
        cancelled: "Ləğv edilib",
      },
      categories: {
        periodicControl: "Dövri yoxlama",
        training: "Tədris",
        healthFollowUp: "Sağlamlıq izləməsi",
        meetingDrill: "İclas və təlim",
        legalObligation: "Hüquqi öhdəlik",
        fieldVisit: "Sahə səfəri",
        ohsCommitteeMeeting: "İSG komitə iclası",
        other: "Digər",
      },
      modal: {
        newTitle: "Yeni tapşırıq",
        editTitle: "Tapşırığı redaktə et",
        optional: "— istəyə bağlı",
        fields: {
          title: "Başlıq *",
          description: "Təsvir",
          category: "Kateqoriya",
          status: "Status",
          company: "Şirkət",
          startDate: "Başlama tarixi *",
          endDate: "Bitmə tarixi",
          recurrence: "Təkrar",
          reminderDays: "Xatırlatma (neçə gün əvvəl)",
          includeTimesheet: "Tabelyerə əlavə et",
          timesheetHours: "İş vaxtı (saat)",
          hourlyRate: "Saatlıq ödəniş",
        },
        placeholders: {
          title: "Tapşırıq başlığı",
          description: "Tapşırıq təsviri…",
          category: "Kateqoriya seçin…",
          company: "Şirkət seçin…",
          hours: "məs. 4,5",
          rate: "məs. 250",
        },
      },
      errors: {
        orgNotFound: "Təşkilat məlumatı tapılmadı. Yenidən daxil olun.",
        saveFailed: "Saxlanarkən xəta baş verdi.",
      },
      confirmDeleteTask: "Bu tapşırığı silmək istədiyinizə əminsiniz?",
    },
  },
  id: {
    shell: {
      title: "Perencana",
      description:
        "Tugas K3, rencana kerja tahunan, rencana pelatihan, dan lembar waktu dalam satu tempat.",
      tabs: {
        planner: { label: "Perencana", desc: "Kalender, tugas, dan pengingat" },
        workPlan: { label: "Rencana kerja tahunan", desc: "Rencana kerja tahunan K3 (formulir resmi)" },
        trainingPlan: { label: "Pelatihan tahunan", desc: "Rencana pelatihan, peserta, dan sertifikat" },
        timesheet: { label: "Lembar waktu", desc: "Pelacakan jam dan biaya" },
      },
    },
    core: {
      pageTitle: "Perencana K3",
      pageDescription: "Rencanakan dan lacak tugas kesehatan dan keselamatan kerja.",
      actions: {
        newTask: "Tugas baru",
        dismissError: "Tutup peringatan",
        cancel: "Batal",
        saving: "Menyimpan…",
        create: "Buat",
        update: "Perbarui",
      },
      stats: { total: "Total" },
      filters: {
        allCategories: "Semua kategori",
        allStatuses: "Semua status",
        allCompanies: "Semua perusahaan",
      },
      views: { month: "Kalender", list: "Daftar" },
      sidebar: {
        categories: "Kategori",
        all: "Semua",
        addCategory: "Tambah kategori",
        quickAdd: "Tambah cepat",
      },
      calendar: { more: "+{count} lainnya" },
      empty: {
        title: "Belum ada tugas",
        description: "Klik tombol «Tugas baru» di atas.",
      },
      recurrence: {
        none: "Tidak berulang",
        daily: "Harian",
        weekly: "Mingguan",
        monthly: "Bulanan",
        quarterly: "Triwulanan",
        biannual: "Semesteran",
        annual: "Tahunan",
      },
      status: {
        planned: "Terencana",
        in_progress: "Berlangsung",
        completed: "Selesai",
        overdue: "Terlambat",
        cancelled: "Dibatalkan",
      },
      categories: {
        periodicControl: "Inspeksi berkala",
        training: "Pelatihan",
        healthFollowUp: "Tindak lanjut kesehatan",
        meetingDrill: "Rapat & simulasi",
        legalObligation: "Kewajiban hukum",
        fieldVisit: "Kunjungan lapangan",
        ohsCommitteeMeeting: "Rapat panitia K3",
        other: "Lainnya",
      },
      modal: {
        newTitle: "Tugas baru",
        editTitle: "Edit tugas",
        optional: "- opsional",
        fields: {
          title: "Judul *",
          description: "Deskripsi",
          category: "Kategori",
          status: "Status",
          company: "Perusahaan",
          startDate: "Tanggal mulai *",
          endDate: "Tanggal selesai",
          recurrence: "Ulangan",
          reminderDays: "Pengingat (berapa hari sebelumnya)",
          includeTimesheet: "Tambahkan ke lembar waktu",
          timesheetHours: "Jam kerja (jam)",
          hourlyRate: "Tarif per jam",
        },
        placeholders: {
          title: "Judul tugas",
          description: "Deskripsi tugas…",
          category: "Pilih kategori…",
          company: "Pilih perusahaan…",
          hours: "mis. 4,5",
          rate: "mis. 250",
        },
      },
      errors: {
        orgNotFound: "Informasi organisasi tidak ditemukan. Silakan masuk lagi.",
        saveFailed: "Terjadi kesalahan saat menyimpan.",
      },
      confirmDeleteTask: "Yakin ingin menghapus tugas ini?",
    },
  },
};

function stripCoreCalendarArrays(core) {
  if (!core || typeof core !== "object") return;
  delete core.months;
  delete core.weekdays;
}

function main() {
  const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const loc = file.replace(/\.json$/, "");
    if (loc === "translations") continue;
    const full = path.join(messagesDir, file);
    const raw = fs.readFileSync(full, "utf8");
    const data = JSON.parse(raw);
    if (!data.planner) continue;

    stripCoreCalendarArrays(data.planner.core);

    const pack = PACK[loc];
    if (pack) {
      data.planner.shell = pack.shell;
      data.planner.core = { ...data.planner.core, ...pack.core };
      stripCoreCalendarArrays(data.planner.core);
    }

    if (data.planner.yearlyWorkPlan && typeof data.planner.yearlyWorkPlan === "object") {
      delete data.planner.yearlyWorkPlan.months;
    }

    if (data.planner.timesheet && typeof data.planner.timesheet === "object") {
      delete data.planner.timesheet.months;
    }

    fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
  }
}

main();
