/**
 * Merges pwaInstallPage + pwaPrompt into all frontend/messages/*.json locales.
 * Run: node scripts/merge-pwa-page-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");

/** @type {Record<string, { pwaInstallPage: Record<string, unknown>; pwaPrompt: Record<string, unknown> }>} */
const PACK = {
  en: {
    pwaInstallPage: {
      metaTitle: "RiskNova app",
      metaDescription:
        "iPhone and iPad: download RiskNova from the App Store. Android and Windows: install the site as a PWA from Chrome or Edge—updates roll out automatically.",
      eyebrow: "App Store & web install",
      heroTitle: "RiskNova on your phone, tablet, and desktop",
      heroBody:
        "Use the native iOS app on iPhone and iPad. On Android and Windows, add getrisknova.com to your home screen or desktop when Chrome or Edge offers Install app.",
      ctaRegister: "Start free",
      ctaLogin: "Sign in to platform",
      updatesTitle: "Updates arrive automatically",
      updatesBody:
        "When the RiskNova web app is updated, your PWA picks up the new version—you don't wait on store updates.",
      cards: {
        android: {
          title: "Android",
          text: "Open RiskNova in Chrome or Edge; if you see an install prompt, choose Install app.",
          step1: "Open getrisknova.com",
          step2: "Tap Install app",
          step3: "Sign in from the RiskNova icon",
        },
        ios: {
          title: "iPhone & iPad",
          text: "Get the native RiskNova app from the App Store for field audits, risk analysis, and Nova on the go.",
          step1: "Open the App Store (or tap the button below)",
          step2: "Search for RiskNova or use our App Store link",
          step3: "Tap Get, then sign in with your platform account",
          cta: "View on the App Store",
        },
        windows: {
          title: "Windows",
          text: "Use the install icon in the Chrome or Edge address bar to open RiskNova in its own desktop window.",
          step1: "Open in Edge or Chrome",
          step2: "Click the install-app icon",
          step3: "Open RiskNova from the Start menu",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "Install RiskNova like an app",
      publicDescription:
        "Chrome and Edge on Android and Windows can install this site when your browser shows an install prompt.",
      publicButton: "Install app",
      appTitle: "Install the RiskNova app",
      appDescription: "Jump back to field work, documents, and Nova from your home screen.",
      appButton: "Install",
      iosHint: "On iPhone and iPad, download RiskNova from the App Store.",
      asideAria: "RiskNova app installation",
      dismissAria: "Dismiss install reminder",
    },
  },
  tr: {
    pwaInstallPage: {
      metaTitle: "RiskNova Uygulaması",
      metaDescription:
        "iPhone ve iPad: RiskNova'yı App Store'dan indirin. Android ve Windows: Chrome veya Edge ile siteyi PWA olarak kurun; güncellemeler otomatik gelir.",
      eyebrow: "App Store ve web kurulumu",
      heroTitle: "RiskNova telefon, tablet ve masaüstünde",
      heroBody:
        "iPhone ve iPad için yerel uygulamayı App Store'dan kullanın. Android ve Windows'ta Chrome veya Edge Cihaza kur / Uygulamayı yükle teklif ettiğinde getrisknova.com'u kurabilirsiniz.",
      ctaRegister: "Ücretsiz başla",
      ctaLogin: "Platforma giriş yap",
      updatesTitle: "Güncellemeler otomatik gelir",
      updatesBody:
        "RiskNova web uygulaması güncellendiğinde PWA da yeni sürümü alır. Bu yüzden mağaza güncellemesi beklemezsiniz.",
      cards: {
        android: {
          title: "Android",
          text: "Chrome veya Edge ile RiskNova'yı açın; kurulum bildirimi görünürse Cihaza kur seçeneğini kullanın.",
          step1: "getrisknova.com adresini aç",
          step2: "Cihaza kur butonuna bas",
          step3: "RiskNova ikonundan giriş yap",
        },
        ios: {
          title: "iPhone ve iPad",
          text: "Saha denetimi, risk analizi ve Nova için yerel RiskNova uygulamasını App Store'dan indirin.",
          step1: "App Store'u açın (veya aşağıdaki düğmeye dokunun)",
          step2: "RiskNova araması yapın veya App Store bağlantımızı kullanın",
          step3: "İndir'e dokunun, ardından platform hesabınızla giriş yapın",
          cta: "App Store'da görüntüle",
        },
        windows: {
          title: "Windows",
          text: "Chrome veya Edge adres çubuğundaki uygulama kur ikonuyla RiskNova'yı ayrı masaüstü penceresi olarak açın.",
          step1: "Edge veya Chrome ile aç",
          step2: "Uygulamayı yükle ikonuna bas",
          step3: "Başlat menüsünden RiskNova'yı aç",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "RiskNova'yı uygulama gibi kur",
      publicDescription:
        "Android ve Windows'ta Chrome ve Edge, kurulum bildirimi gösterdiğinde bu siteyi uygulama olarak yükleyebilir.",
      publicButton: "Cihaza kur",
      appTitle: "RiskNova uygulamasını kur",
      appDescription: "Saha, doküman ve Nova akışlarına ana ekrandan dön.",
      appButton: "Kur",
      iosHint: "iPhone ve iPad'de RiskNova'yı App Store'dan indirin.",
      asideAria: "RiskNova uygulama kurulumu",
      dismissAria: "Kurulum hatırlatıcısını kapat",
    },
  },
  de: {
    pwaInstallPage: {
      metaTitle: "RiskNova App",
      metaDescription:
        "iPhone und iPad: RiskNova im App Store laden. Android und Windows: RiskNova als PWA in Chrome oder Edge installieren – Updates kommen automatisch.",
      eyebrow: "App Store & Web-Installation",
      heroTitle: "RiskNova auf Smartphone, Tablet und Desktop",
      heroBody:
        "Nutzen Sie die native iOS-App auf iPhone und iPad. Unter Android und Windows installieren Sie getrisknova.com, wenn Chrome oder Edge „App installieren“ anbietet.",
      ctaRegister: "Kostenlos starten",
      ctaLogin: "Bei der Plattform anmelden",
      updatesTitle: "Updates kommen automatisch",
      updatesBody:
        "Wenn die RiskNova-Web-App aktualisiert wird, erhält Ihre PWA die neue Version – ohne Warten auf Store-Updates.",
      cards: {
        android: {
          title: "Android",
          text: "Öffnen Sie RiskNova in Chrome oder Edge; bei Installationshinweis „App installieren“ wählen.",
          step1: "getrisknova.com öffnen",
          step2: "„App installieren“ tippen",
          step3: "Über das RiskNova-Symbol anmelden",
        },
        ios: {
          title: "iPhone & iPad",
          text: "Laden Sie die native RiskNova-App aus dem App Store für Audits, Risikoanalyse und Nova unterwegs.",
          step1: "App Store öffnen (oder unten tippen)",
          step2: "Nach „RiskNova“ suchen oder unseren App-Store-Link nutzen",
          step3: "Laden tippen und sich mit Ihrem Plattformkonto anmelden",
          cta: "Im App Store ansehen",
        },
        windows: {
          title: "Windows",
          text: "Nutzen Sie das Install-Symbol in der Adressleiste von Chrome oder Edge für ein eigenes Fenster.",
          step1: "In Edge oder Chrome öffnen",
          step2: "App-installieren-Symbol klicken",
          step3: "RiskNova über das Startmenü öffnen",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "RiskNova wie eine App installieren",
      publicDescription:
        "Chrome und Edge unter Android und Windows können diese Website installieren, wenn ein Installationshinweis erscheint.",
      publicButton: "App installieren",
      appTitle: "RiskNova-App installieren",
      appDescription: "Zurück zu Feld, Dokumenten und Nova über den Startbildschirm.",
      appButton: "Installieren",
      iosHint: "Auf iPhone und iPad: RiskNova im App Store laden.",
      asideAria: "RiskNova App-Installation",
      dismissAria: "Installationshinweis schließen",
    },
  },
  fr: {
    pwaInstallPage: {
      metaTitle: "Application RiskNova",
      metaDescription:
        "iPhone et iPad : téléchargez RiskNova sur l’App Store. Android et Windows : installez le site en PWA depuis Chrome ou Edge — les mises à jour arrivent automatiquement.",
      eyebrow: "App Store et installation web",
      heroTitle: "RiskNova sur téléphone, tablette et ordinateur",
      heroBody:
        "Utilisez l’app iOS native sur iPhone et iPad. Sur Android et Windows, ajoutez getrisknova.com lorsque Chrome ou Edge propose Installer l’application.",
      ctaRegister: "Commencer gratuitement",
      ctaLogin: "Connexion à la plateforme",
      updatesTitle: "Les mises à jour arrivent automatiquement",
      updatesBody:
        "Lorsque l’application web RiskNova est mise à jour, votre PWA récupère la nouvelle version sans attendre le store.",
      cards: {
        android: {
          title: "Android",
          text: "Ouvrez RiskNova dans Chrome ou Edge ; si une invite apparaît, choisissez Installer l’application.",
          step1: "Ouvrir getrisknova.com",
          step2: "Appuyer sur Installer l’app",
          step3: "Se connecter via l’icône RiskNova",
        },
        ios: {
          title: "iPhone et iPad",
          text: "Téléchargez l’app native RiskNova sur l’App Store pour les audits, l’analyse des risques et Nova en déplacement.",
          step1: "Ouvrir l’App Store (ou appuyer sur le bouton ci-dessous)",
          step2: "Rechercher RiskNova ou utiliser notre lien App Store",
          step3: "Appuyer sur Obtenir, puis se connecter avec votre compte",
          cta: "Voir sur l’App Store",
        },
        windows: {
          title: "Windows",
          text: "Utilisez l’icône d’installation dans la barre d’adresse de Chrome ou Edge pour une fenêtre dédiée.",
          step1: "Ouvrir dans Edge ou Chrome",
          step2: "Cliquer sur l’icône Installer l’app",
          step3: "Ouvrir RiskNova depuis le menu Démarrer",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "Installer RiskNova comme une app",
      publicDescription:
        "Chrome et Edge sur Android et Windows peuvent installer ce site lorsqu’une invite d’installation apparaît.",
      publicButton: "Installer l’app",
      appTitle: "Installer l’application RiskNova",
      appDescription: "Retour terrain, documents et Nova depuis l’écran d’accueil.",
      appButton: "Installer",
      iosHint: "Sur iPhone et iPad, téléchargez RiskNova sur l’App Store.",
      asideAria: "Installation de l’app RiskNova",
      dismissAria: "Fermer le rappel d’installation",
    },
  },
  es: {
    pwaInstallPage: {
      metaTitle: "App RiskNova",
      metaDescription:
        "iPhone e iPad: descarga RiskNova en el App Store. Android y Windows: instala el sitio como PWA desde Chrome o Edge; las actualizaciones llegan solas.",
      eyebrow: "App Store e instalación web",
      heroTitle: "RiskNova en móvil, tablet y escritorio",
      heroBody:
        "Usa la app nativa de iOS en iPhone e iPad. En Android y Windows, añade getrisknova.com cuando Chrome o Edge ofrezcan Instalar aplicación.",
      ctaRegister: "Empezar gratis",
      ctaLogin: "Iniciar sesión en la plataforma",
      updatesTitle: "Las actualizaciones llegan solas",
      updatesBody:
        "Cuando se actualiza la web de RiskNova, tu PWA obtiene la nueva versión sin esperar a la tienda.",
      cards: {
        android: {
          title: "Android",
          text: "Abre RiskNova en Chrome o Edge; si aparece el aviso, elige Instalar aplicación.",
          step1: "Abre getrisknova.com",
          step2: "Pulsa Instalar app",
          step3: "Inicia sesión desde el icono de RiskNova",
        },
        ios: {
          title: "iPhone e iPad",
          text: "Obtén la app nativa RiskNova en el App Store para auditorías, análisis de riesgos y Nova en el campo.",
          step1: "Abre el App Store (o pulsa el botón de abajo)",
          step2: "Busca RiskNova o usa nuestro enlace del App Store",
          step3: "Pulsa Obtener e inicia sesión con tu cuenta",
          cta: "Ver en el App Store",
        },
        windows: {
          title: "Windows",
          text: "Usa el icono de instalar en la barra de direcciones de Chrome o Edge para una ventana propia.",
          step1: "Abre en Edge o Chrome",
          step2: "Pulsa el icono instalar app",
          step3: "Abre RiskNova desde el menú Inicio",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "Instala RiskNova como una app",
      publicDescription:
        "Chrome y Edge en Android y Windows pueden instalar este sitio cuando el navegador muestre la invitación de instalación.",
      publicButton: "Instalar app",
      appTitle: "Instalar la app RiskNova",
      appDescription: "Vuelve a campo, documentos y Nova desde el inicio.",
      appButton: "Instalar",
      iosHint: "En iPhone e iPad, descarga RiskNova en el App Store.",
      asideAria: "Instalación de la app RiskNova",
      dismissAria: "Cerrar recordatorio de instalación",
    },
  },
  ru: {
    pwaInstallPage: {
      metaTitle: "Приложение RiskNova",
      metaDescription:
        "iPhone и iPad: скачайте RiskNova из App Store. Android и Windows: установите сайт как PWA в Chrome или Edge — обновления приходят автоматически.",
      eyebrow: "App Store и веб-установка",
      heroTitle: "RiskNova на телефоне, планшете и компьютере",
      heroBody:
        "Используйте нативное приложение для iOS на iPhone и iPad. На Android и Windows добавьте getrisknova.com, когда Chrome или Edge предложат «Установить приложение».",
      ctaRegister: "Начать бесплатно",
      ctaLogin: "Войти на платформу",
      updatesTitle: "Обновления приходят автоматически",
      updatesBody:
        "Когда веб-приложение RiskNova обновляется, PWA получает новую версию без ожидания обновления из магазина.",
      cards: {
        android: {
          title: "Android",
          text: "Откройте RiskNova в Chrome или Edge; при запросе выберите Установить приложение.",
          step1: "Откройте getrisknova.com",
          step2: "Нажмите Установить приложение",
          step3: "Войдите через значок RiskNova",
        },
        ios: {
          title: "iPhone и iPad",
          text: "Скачайте нативное приложение RiskNova из App Store для аудитов, анализа рисков и Nova в поле.",
          step1: "Откройте App Store (или нажмите кнопку ниже)",
          step2: "Найдите RiskNova или перейдите по нашей ссылке App Store",
          step3: "Нажмите Загрузить и войдите в аккаунт платформы",
          cta: "Открыть в App Store",
        },
        windows: {
          title: "Windows",
          text: "Используйте значок установки в адресной строке Chrome или Edge для отдельного окна.",
          step1: "Откройте в Edge или Chrome",
          step2: "Нажмите значок установки приложения",
          step3: "Запустите RiskNova из меню Пуск",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "Установите RiskNova как приложение",
      publicDescription:
        "Chrome и Edge на Android и Windows могут установить этот сайт, когда браузер покажет запрос на установку.",
      publicButton: "Установить приложение",
      appTitle: "Установить приложение RiskNova",
      appDescription: "Возвращайтесь к полю, документам и Nova с главного экрана.",
      appButton: "Установить",
      iosHint: "На iPhone и iPad скачайте RiskNova из App Store.",
      asideAria: "Установка приложения RiskNova",
      dismissAria: "Закрыть напоминание об установке",
    },
  },
  ar: {
    pwaInstallPage: {
      metaTitle: "تطبيق RiskNova",
      metaDescription:
        "iPhone وiPad: نزّل RiskNova من App Store. Android وWindows: ثبّت الموقع كـ PWA من Chrome أو Edge — التحديثات تصل تلقائيًا.",
      eyebrow: "App Store والتثبيت من الويب",
      heroTitle: "RiskNova على الهاتف والجهاز اللوحي وسطح المكتب",
      heroBody:
        "استخدم تطبيق iOS الأصلي على iPhone وiPad. على Android وWindows، أضف getrisknova.com عندما يعرض Chrome أو Edge خيار تثبيت التطبيق.",
      ctaRegister: "ابدأ مجانًا",
      ctaLogin: "تسجيل الدخول إلى المنصة",
      updatesTitle: "التحديثات تصل تلقائيًا",
      updatesBody:
        "عند تحديث تطبيق RiskNova على الويب، يتلقى تطبيقك التقدّمي الإصدار الجديد دون انتظار تحديث المتجر.",
      cards: {
        android: {
          title: "Android",
          text: "افتح RiskNova في Chrome أو Edge؛ إذا ظهرت رسالة التثبيت، اختر تثبيت التطبيق.",
          step1: "افتح getrisknova.com",
          step2: "اضغط تثبيت التطبيق",
          step3: "سجّل الدخول من أيقونة RiskNova",
        },
        ios: {
          title: "iPhone وiPad",
          text: "احصل على تطبيق RiskNova الأصلي من App Store للتدقيق وتحليل المخاطر وNova في الميدان.",
          step1: "افتح App Store (أو اضغط الزر أدناه)",
          step2: "ابحث عن RiskNova أو استخدم رابط App Store",
          step3: "اضغط الحصول ثم سجّل الدخول بحسابك",
          cta: "عرض في App Store",
        },
        windows: {
          title: "Windows",
          text: "استخدم أيقونة التثبيت في شريط عنوان Chrome أو Edge لفتح نافذة مستقلة.",
          step1: "افتح في Edge أو Chrome",
          step2: "اضغط أيقونة تثبيت التطبيق",
          step3: "افتح RiskNova من قائمة ابدأ",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "ثبّت RiskNova كتطبيق",
      publicDescription:
        "يمكن لـ Chrome وEdge على Android وWindows تثبيت هذا الموقع عند ظهور مطالبة التثبيت.",
      publicButton: "تثبيت التطبيق",
      appTitle: "ثبّت تطبيق RiskNova",
      appDescription: "ارجع إلى الميدان والمستندات وNova من الشاشة الرئيسية.",
      appButton: "تثبيت",
      iosHint: "على iPhone وiPad، نزّل RiskNova من App Store.",
      asideAria: "تثبيت تطبيق RiskNova",
      dismissAria: "إغلاق تذكير التثبيت",
    },
  },
  zh: {
    pwaInstallPage: {
      metaTitle: "RiskNova 应用",
      metaDescription:
        "iPhone 与 iPad：从 App Store 下载 RiskNova。Android 与 Windows：在 Chrome 或 Edge 中将站点安装为 PWA，更新会自动送达。",
      eyebrow: "App Store 与网页安装",
      heroTitle: "RiskNova 在手机、平板和电脑上",
      heroBody:
        "在 iPhone 与 iPad 上使用原生 iOS 应用。在 Android 与 Windows 上，当 Chrome 或 Edge 提供安装应用时，可安装 getrisknova.com。",
      ctaRegister: "免费开始",
      ctaLogin: "登录平台",
      updatesTitle: "更新自动送达",
      updatesBody: "RiskNova 网页应用更新后，您的 PWA 会获得新版本，无需等待商店更新。",
      cards: {
        android: {
          title: "Android",
          text: "在 Chrome 或 Edge 中打开 RiskNova；若出现安装提示，请选择安装应用。",
          step1: "打开 getrisknova.com",
          step2: "点击安装应用",
          step3: "从 RiskNova 图标登录",
        },
        ios: {
          title: "iPhone 与 iPad",
          text: "从 App Store 获取 RiskNova 原生应用，便于现场审核、风险分析与 Nova。",
          step1: "打开 App Store（或点击下方按钮）",
          step2: "搜索 RiskNova 或使用我们的 App Store 链接",
          step3: "轻点获取，然后使用平台账号登录",
          cta: "在 App Store 查看",
        },
        windows: {
          title: "Windows",
          text: "使用 Chrome 或 Edge 地址栏中的安装图标，在独立桌面窗口中打开。",
          step1: "用 Edge 或 Chrome 打开",
          step2: "点击安装应用图标",
          step3: "从开始菜单打开 RiskNova",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "像应用一样安装 RiskNova",
      publicDescription: "Android 与 Windows 上的 Chrome 和 Edge 在安装提示出现时可安装本站。",
      publicButton: "安装应用",
      appTitle: "安装 RiskNova 应用",
      appDescription: "从主屏幕返回现场、文档与 Nova 流程。",
      appButton: "安装",
      iosHint: "在 iPhone 与 iPad 上，请从 App Store 下载 RiskNova。",
      asideAria: "RiskNova 应用安装",
      dismissAria: "关闭安装提醒",
    },
  },
  ja: {
    pwaInstallPage: {
      metaTitle: "RiskNova アプリ",
      metaDescription:
        "iPhone と iPad: App Store から RiskNova をダウンロード。Android と Windows: Chrome または Edge からサイトを PWA としてインストール。更新は自動で届きます。",
      eyebrow: "App Store とウェブインストール",
      heroTitle: "スマートフォン、タブレット、デスクトップで RiskNova",
      heroBody:
        "iPhone と iPad ではネイティブの iOS アプリを。Android と Windows では、Chrome または Edge がアプリのインストールを案内したときに getrisknova.com を追加できます。",
      ctaRegister: "無料で始める",
      ctaLogin: "プラットフォームにログイン",
      updatesTitle: "更新は自動で届く",
      updatesBody:
        "RiskNova のウェブアプリが更新されると、PWA も新バージョンを取得します。ストアの更新を待つ必要はありません。",
      cards: {
        android: {
          title: "Android",
          text: "Chrome または Edge で RiskNova を開き、インストールの案内が出たらアプリをインストールを選びます。",
          step1: "getrisknova.com を開く",
          step2: "アプリをインストールをタップ",
          step3: "RiskNova のアイコンからログイン",
        },
        ios: {
          title: "iPhone と iPad",
          text: "監査、リスク分析、Nova のために App Store からネイティブの RiskNova アプリを入手。",
          step1: "App Store を開く（または下のボタンをタップ）",
          step2: "RiskNova を検索するか App Store のリンクを使う",
          step3: "入手をタップし、プラットフォームのアカウントでログイン",
          cta: "App Store で見る",
        },
        windows: {
          title: "Windows",
          text: "Chrome または Edge のアドレスバーのインストールアイコンで、別ウィンドウとして開けます。",
          step1: "Edge または Chrome で開く",
          step2: "アプリのインストールアイコンをクリック",
          step3: "スタートメニューから RiskNova を開く",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "RiskNova をアプリのようにインストール",
      publicDescription:
        "Android と Windows の Chrome と Edge は、インストールの案内が表示されたときにこのサイトをインストールできます。",
      publicButton: "アプリをインストール",
      appTitle: "RiskNova アプリをインストール",
      appDescription: "ホーム画面から現場・ドキュメント・Nova に戻れます。",
      appButton: "インストール",
      iosHint: "iPhone と iPad では App Store から RiskNova をダウンロードしてください。",
      asideAria: "RiskNova アプリのインストール",
      dismissAria: "インストールのリマインダーを閉じる",
    },
  },
  ko: {
    pwaInstallPage: {
      metaTitle: "RiskNova 앱",
      metaDescription:
        "iPhone 및 iPad: App Store에서 RiskNova를 다운로드하세요. Android 및 Windows: Chrome 또는 Edge에서 사이트를 PWA로 설치하면 업데이트가 자동으로 적용됩니다.",
      eyebrow: "App Store 및 웹 설치",
      heroTitle: "휴대폰, 태블릿, 데스크톱에서 RiskNova",
      heroBody:
        "iPhone과 iPad에서는 네이티브 iOS 앱을 사용하세요. Android와 Windows에서는 Chrome 또는 Edge가 앱 설치를 제안할 때 getrisknova.com을 추가할 수 있습니다.",
      ctaRegister: "무료로 시작",
      ctaLogin: "플랫폼 로그인",
      updatesTitle: "업데이트가 자동으로 적용됩니다",
      updatesBody:
        "RiskNova 웹 앱이 업데이트되면 PWA도 새 버전을 받습니다. 스토어 업데이트를 기다릴 필요가 없습니다.",
      cards: {
        android: {
          title: "Android",
          text: "Chrome 또는 Edge에서 RiskNova를 열고, 설치 안내가 나오면 앱 설치를 선택하세요.",
          step1: "getrisknova.com 열기",
          step2: "앱 설치 탭",
          step3: "RiskNova 아이콘에서 로그인",
        },
        ios: {
          title: "iPhone 및 iPad",
          text: "현장 감사, 위험 분석, Nova를 위해 App Store에서 RiskNova 네이티브 앱을 받으세요.",
          step1: "App Store 열기(또는 아래 버튼 탭)",
          step2: "RiskNova를 검색하거나 App Store 링크 사용",
          step3: "받기를 누른 뒤 플랫폼 계정으로 로그인",
          cta: "App Store에서 보기",
        },
        windows: {
          title: "Windows",
          text: "Chrome 또는 Edge 주소창의 설치 아이콘으로 독립 창에서 엽니다.",
          step1: "Edge 또는 Chrome으로 열기",
          step2: "앱 설치 아이콘 클릭",
          step3: "시작 메뉴에서 RiskNova 열기",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "RiskNova를 앱처럼 설치",
      publicDescription:
        "Android와 Windows의 Chrome과 Edge는 설치 안내가 표시되면 이 사이트를 앱으로 설치할 수 있습니다.",
      publicButton: "앱 설치",
      appTitle: "RiskNova 앱 설치",
      appDescription: "홈 화면에서 현장, 문서, Nova로 돌아가세요.",
      appButton: "설치",
      iosHint: "iPhone과 iPad에서는 App Store에서 RiskNova를 다운로드하세요.",
      asideAria: "RiskNova 앱 설치",
      dismissAria: "설치 알림 닫기",
    },
  },
  hi: {
    pwaInstallPage: {
      metaTitle: "RiskNova ऐप",
      metaDescription:
        "iPhone और iPad: App Store से RiskNova डाउनलोड करें। Android और Windows: Chrome या Edge से साइट को PWA के रूप में इंस्टॉल करें—अपडेट अपने आप आते हैं।",
      eyebrow: "App Store और वेब इंस्टॉल",
      heroTitle: "RiskNova फ़ोन, टैबलेट और डेस्कटॉप पर",
      heroBody:
        "iPhone और iPad पर नेटिव iOS ऐप का उपयोग करें। Android और Windows पर जब Chrome या Edge ऐप इंस्टॉल करने की पेशकश करे तो getrisknova.com जोड़ें।",
      ctaRegister: "मुफ़्त में शुरू करें",
      ctaLogin: "प्लेटफ़ॉर्म पर साइन इन करें",
      updatesTitle: "अपडेट अपने आप आते हैं",
      updatesBody:
        "जब RiskNova वेब ऐप अपडेट होता है, आपका PWA नया संस्करण ले लेता है—स्टोर अपडेट का इंतज़ार नहीं।",
      cards: {
        android: {
          title: "Android",
          text: "Chrome या Edge में RiskNova खोलें; इंस्टॉल संकेत दिखे तो ऐप इंस्टॉल करें चुनें।",
          step1: "getrisknova.com खोलें",
          step2: "ऐप इंस्टॉल पर टैप करें",
          step3: "RiskNova आइकन से साइन इन करें",
        },
        ios: {
          title: "iPhone और iPad",
          text: "ऑडिट, जोखिम विश्लेषण और Nova के लिए App Store से नेटिव RiskNova ऐप लें।",
          step1: "App Store खोलें (या नीचे बटन टैप करें)",
          step2: "RiskNova खोजें या हमारा App Store लिंक उपयोग करें",
          step3: "प्राप्त करें पर टैप करें, फिर अपने खाते से साइन इन करें",
          cta: "App Store पर देखें",
        },
        windows: {
          title: "Windows",
          text: "Chrome या Edge पट्टी में इंस्टॉल आइकन से अलग डेस्कटॉप विंडो में खोलें।",
          step1: "Edge या Chrome में खोलें",
          step2: "ऐप इंस्टॉल आइकन पर क्लिक करें",
          step3: "स्टार्ट मेनू से RiskNova खोलें",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "RiskNova को ऐप की तरह इंस्टॉल करें",
      publicDescription:
        "Android और Windows पर Chrome और Edge इंस्टॉल संकेत दिखने पर इस साइट को ऐप के रूप में इंस्टॉल कर सकते हैं।",
      publicButton: "ऐप इंस्टॉल करें",
      appTitle: "RiskNova ऐप इंस्टॉल करें",
      appDescription: "होम स्क्रीन से फ़ील्ड, दस्तावेज़ और Nova पर लौटें।",
      appButton: "इंस्टॉल करें",
      iosHint: "iPhone और iPad पर App Store से RiskNova डाउनलोड करें।",
      asideAria: "RiskNova ऐप इंस्टॉलेशन",
      dismissAria: "इंस्टॉल रिमाइंडर बंद करें",
    },
  },
  az: {
    pwaInstallPage: {
      metaTitle: "RiskNova tətbiqi",
      metaDescription:
        "iPhone və iPad: RiskNova-nı App Store-dan yükləyin. Android və Windows: Chrome və ya Edge ilə saytı PWA kimi quraşdırın — yeniləmələr avtomatik gəlir.",
      eyebrow: "App Store və veb quraşdırma",
      heroTitle: "RiskNova telefon, planşet və masaüstündə",
      heroBody:
        "iPhone və iPad üçün native iOS tətbiqindən istifadə edin. Android və Windows-da Chrome və ya Edge tətbiqi quraşdırma təklif etdikdə getrisknova.com əlavə edin.",
      ctaRegister: "Pulsuz başla",
      ctaLogin: "Platformaya daxil ol",
      updatesTitle: "Yeniləmələr avtomatik gəlir",
      updatesBody:
        "RiskNova veb tətbiqi yeniləndikdə PWA da yeni versiyanı alır; mağaza yeniləməsini gözləməsiz.",
      cards: {
        android: {
          title: "Android",
          text: "RiskNova-nı Chrome və ya Edge-də açın; quraşdırma təklifi görünsə, Tətbiqi quraşdır seçin.",
          step1: "getrisknova.com ünvanını aç",
          step2: "Tətbiqi quraşdır düyməsinə bas",
          step3: "RiskNova ikonundan daxil ol",
        },
        ios: {
          title: "iPhone və iPad",
          text: "Yoxlamalar, risk təhlili və Nova üçün native RiskNova tətbiqini App Store-dan əldə edin.",
          step1: "App Store-u açın (və ya aşağıdakı düyməyə toxunun)",
          step2: "RiskNova axtarın və ya App Store keçidimizdən istifadə edin",
          step3: "Yükləyə toxunun, sonra platforma hesabınızla daxil olun",
          cta: "App Store-da bax",
        },
        windows: {
          title: "Windows",
          text: "Chrome və ya Edge ünvan sətirindəki quraşdırma ikonu ilə ayrıca masaüstü pəncərəsində açın.",
          step1: "Edge və ya Chrome ilə aç",
          step2: "Tətbiqi yüklə ikonuna bas",
          step3: "Başlat menyusundan RiskNova-nı aç",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "RiskNova-nı tətbiq kimi quraşdır",
      publicDescription:
        "Android və Windows-da Chrome və Edge quraşdırma təklifi göstərəndə bu saytı tətbiq kimi quraşdıra bilər.",
      publicButton: "Cihaza quraşdır",
      appTitle: "RiskNova tətbiqini quraşdır",
      appDescription: "Saha, sənəd və Nova axınlarına ana ekrandan qayıt.",
      appButton: "Quraşdır",
      iosHint: "iPhone və iPad üçün RiskNova-nı App Store-dan yükləyin.",
      asideAria: "RiskNova tətbiq quraşdırması",
      dismissAria: "Quraşdırma xatırladıcısını bağla",
    },
  },
  id: {
    pwaInstallPage: {
      metaTitle: "Aplikasi RiskNova",
      metaDescription:
        "iPhone dan iPad: unduh RiskNova di App Store. Android dan Windows: pasang situs sebagai PWA dari Chrome atau Edge — pembaruan tiba otomatis.",
      eyebrow: "App Store & pemasangan web",
      heroTitle: "RiskNova di ponsel, tablet, dan desktop",
      heroBody:
        "Gunakan aplikasi iOS asli di iPhone dan iPad. Di Android dan Windows, tambahkan getrisknova.com saat Chrome atau Edge menawarkan Pasang aplikasi.",
      ctaRegister: "Mulai gratis",
      ctaLogin: "Masuk ke platform",
      updatesTitle: "Pembaruan datang otomatis",
      updatesBody:
        "Saat aplikasi web RiskNova diperbarui, PWA Anda mendapat versi baru—tanpa menunggu pembaruan toko.",
      cards: {
        android: {
          title: "Android",
          text: "Buka RiskNova di Chrome atau Edge; jika ada prompt, pilih Pasang aplikasi.",
          step1: "Buka getrisknova.com",
          step2: "Ketuk Pasang aplikasi",
          step3: "Masuk dari ikon RiskNova",
        },
        ios: {
          title: "iPhone & iPad",
          text: "Dapatkan aplikasi asli RiskNova di App Store untuk audit, analisis risiko, dan Nova di lapangan.",
          step1: "Buka App Store (atau ketuk tombol di bawah)",
          step2: "Cari RiskNova atau gunakan tautan App Store kami",
          step3: "Ketuk Dapatkan, lalu masuk dengan akun platform Anda",
          cta: "Lihat di App Store",
        },
        windows: {
          title: "Windows",
          text: "Gunakan ikon pasang di bilah alamat Chrome atau Edge untuk jendela desktop sendiri.",
          step1: "Buka di Edge atau Chrome",
          step2: "Klik ikon pasang aplikasi",
          step3: "Buka RiskNova dari menu Mulai",
        },
      },
    },
    pwaPrompt: {
      publicTitle: "Pasang RiskNova seperti aplikasi",
      publicDescription:
        "Chrome dan Edge di Android dan Windows dapat memasang situs ini saat browser menampilkan undangan pemasangan.",
      publicButton: "Pasang aplikasi",
      appTitle: "Pasang aplikasi RiskNova",
      appDescription: "Kembali ke lapangan, dokumen, dan Nova dari layar beranda.",
      appButton: "Pasang",
      iosHint: "Di iPhone dan iPad, unduh RiskNova di App Store.",
      asideAria: "Pemasangan aplikasi RiskNova",
      dismissAria: "Tutup pengingat pemasangan",
    },
  },
};

const locales = [
  "tr",
  "en",
  "ar",
  "ru",
  "de",
  "fr",
  "es",
  "zh",
  "ja",
  "ko",
  "hi",
  "az",
  "id",
];

for (const locale of locales) {
  const pack = PACK[locale];
  if (!pack) {
    console.error("missing PACK for", locale);
    process.exit(1);
  }
  const msgPath = path.join(messagesDir, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(msgPath, "utf8"));
  j.pwaInstallPage = pack.pwaInstallPage;
  j.pwaPrompt = pack.pwaPrompt;
  fs.writeFileSync(msgPath, `${JSON.stringify(j, null, 2)}\n`);
}

console.log("merged pwaInstallPage + pwaPrompt:", locales.join(", "));

