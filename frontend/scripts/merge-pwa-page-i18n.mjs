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
        "Install RiskNova as a PWA on iOS, Android, and Windows without an app store.",
      eyebrow: "No app store required",
      heroTitle: "Use RiskNova like an app on mobile and desktop",
      heroBody:
        "Add RiskNova to your home screen or desktop on iOS, Android, and Windows. Updates to the site roll out to your installed experience automatically.",
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
          text: "Open in Safari; use Share → Add to Home Screen to create the RiskNova icon.",
          step1: "Open the site in Safari",
          step2: "Tap the Share icon",
          step3: "Choose Add to Home Screen",
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
      publicDescription: "Open quickly in a separate window on iOS, Android, and Windows.",
      publicButton: "Install app",
      appTitle: "Install the RiskNova app",
      appDescription: "Jump back to field work, documents, and Nova from your home screen.",
      appButton: "Install",
      iosHint: "On iPhone/iPad, use Share → Add to Home Screen.",
      asideAria: "RiskNova app installation",
      dismissAria: "Dismiss install reminder",
    },
  },
  tr: {
    pwaInstallPage: {
      metaTitle: "RiskNova Uygulaması",
      metaDescription:
        "RiskNova'yı iOS, Android ve Windows cihazlarınıza mağaza gerektirmeden PWA olarak kurun.",
      eyebrow: "Store gerektirmeyen uygulama",
      heroTitle: "RiskNova'yı mobil ve masaüstünde uygulama gibi kullanın",
      heroBody:
        "iOS, Android ve Windows cihazlarda RiskNova'yı ana ekrana veya masaüstüne ekleyin. Siteye gelen güncellemeler uygulama deneyimine de otomatik yansır.",
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
          text: "Safari ile açın; Paylaş menüsünden Ana Ekrana Ekle seçeneğini kullanarak RiskNova ikonunu oluşturun.",
          step1: "Safari'de siteyi aç",
          step2: "Paylaş ikonuna dokun",
          step3: "Ana Ekrana Ekle seçeneğini seç",
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
      publicDescription: "iOS, Android ve Windows'ta ayrı pencereyle hızlı aç.",
      publicButton: "Cihaza kur",
      appTitle: "RiskNova uygulamasını kur",
      appDescription: "Saha, doküman ve Nova akışlarına ana ekrandan dön.",
      appButton: "Kur",
      iosHint: "iPhone/iPad için Paylaş menüsünden Ana Ekrana Ekle seçeneğini kullan.",
      asideAria: "RiskNova uygulama kurulumu",
      dismissAria: "Kurulum hatırlatıcısını kapat",
    },
  },
  de: {
    pwaInstallPage: {
      metaTitle: "RiskNova App",
      metaDescription:
        "Installieren Sie RiskNova als PWA auf iOS, Android und Windows – ohne App Store.",
      eyebrow: "Kein App Store nötig",
      heroTitle: "Nutzen Sie RiskNova wie eine App auf Mobilgerät und Desktop",
      heroBody:
        "Fügen Sie RiskNova auf iOS, Android und Windows zum Startbildschirm oder Desktop hinzu. Website-Updates gelangen automatisch in Ihre installierte App.",
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
          text: "In Safari öffnen; über Teilen → Zum Home-Bildschirm das RiskNova-Symbol anlegen.",
          step1: "Website in Safari öffnen",
          step2: "Teilen-Symbol tippen",
          step3: "„Zum Home-Bildschirm“ wählen",
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
      publicDescription: "Schnell in eigenem Fenster auf iOS, Android und Windows.",
      publicButton: "App installieren",
      appTitle: "RiskNova-App installieren",
      appDescription: "Zurück zu Feld, Dokumenten und Nova über den Startbildschirm.",
      appButton: "Installieren",
      iosHint: "Auf iPhone/iPad: Teilen → Zum Home-Bildschirm.",
      asideAria: "RiskNova App-Installation",
      dismissAria: "Installationshinweis schließen",
    },
  },
  fr: {
    pwaInstallPage: {
      metaTitle: "Application RiskNova",
      metaDescription:
        "Installez RiskNova en PWA sur iOS, Android et Windows sans passer par un store.",
      eyebrow: "Sans store d’applications",
      heroTitle: "Utilisez RiskNova comme une application sur mobile et bureau",
      heroBody:
        "Ajoutez RiskNova à l’écran d’accueil ou au bureau sur iOS, Android et Windows. Les mises à jour du site se reflètent automatiquement dans l’app installée.",
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
          text: "Ouvrez dans Safari ; via Partager → Sur l’écran d’accueil, créez l’icône RiskNova.",
          step1: "Ouvrir le site dans Safari",
          step2: "Appuyer sur Partager",
          step3: "Choisir Sur l’écran d’accueil",
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
      publicDescription: "Ouverture rapide dans une fenêtre séparée sur iOS, Android et Windows.",
      publicButton: "Installer l’app",
      appTitle: "Installer l’application RiskNova",
      appDescription: "Retour terrain, documents et Nova depuis l’écran d’accueil.",
      appButton: "Installer",
      iosHint: "Sur iPhone/iPad : Partager → Sur l’écran d’accueil.",
      asideAria: "Installation de l’app RiskNova",
      dismissAria: "Fermer le rappel d’installation",
    },
  },
  es: {
    pwaInstallPage: {
      metaTitle: "App RiskNova",
      metaDescription:
        "Instala RiskNova como PWA en iOS, Android y Windows sin tienda de aplicaciones.",
      eyebrow: "Sin tienda de apps",
      heroTitle: "Usa RiskNova como una app en móvil y escritorio",
      heroBody:
        "Añade RiskNova a la pantalla de inicio o al escritorio en iOS, Android y Windows. Las actualizaciones web llegan automáticamente a tu experiencia instalada.",
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
          text: "Abre en Safari; con Compartir → Añadir a pantalla de inicio creas el icono.",
          step1: "Abre el sitio en Safari",
          step2: "Toca Compartir",
          step3: "Elige Añadir a pantalla de inicio",
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
      publicDescription: "Abre rápido en ventana aparte en iOS, Android y Windows.",
      publicButton: "Instalar app",
      appTitle: "Instalar la app RiskNova",
      appDescription: "Vuelve a campo, documentos y Nova desde el inicio.",
      appButton: "Instalar",
      iosHint: "En iPhone/iPad: Compartir → Añadir a pantalla de inicio.",
      asideAria: "Instalación de la app RiskNova",
      dismissAria: "Cerrar recordatorio de instalación",
    },
  },
  ru: {
    pwaInstallPage: {
      metaTitle: "Приложение RiskNova",
      metaDescription:
        "Установите RiskNova как PWA на iOS, Android и Windows без магазина приложений.",
      eyebrow: "Без магазина приложений",
      heroTitle: "Используйте RiskNova как приложение на телефоне и компьютере",
      heroBody:
        "Добавьте RiskNova на главный экран или рабочий стол на iOS, Android и Windows. Обновления сайта автоматически попадают в установленное приложение.",
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
          text: "Откройте в Safari; через Поделиться → На экран «Домой» создайте значок.",
          step1: "Откройте сайт в Safari",
          step2: "Нажмите Поделиться",
          step3: "Выберите На экран «Домой»",
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
      publicDescription: "Быстрый запуск в отдельном окне на iOS, Android и Windows.",
      publicButton: "Установить приложение",
      appTitle: "Установить приложение RiskNova",
      appDescription: "Возвращайтесь к полю, документам и Nova с главного экрана.",
      appButton: "Установить",
      iosHint: "На iPhone/iPad: Поделиться → На экран «Домой».",
      asideAria: "Установка приложения RiskNova",
      dismissAria: "Закрыть напоминание об установке",
    },
  },
  ar: {
    pwaInstallPage: {
      metaTitle: "تطبيق RiskNova",
      metaDescription:
        "ثبّت RiskNova كتطبيق ويب تقدّمي (PWA) على iOS وAndroid وWindows دون متجر تطبيقات.",
      eyebrow: "دون الحاجة إلى متجر",
      heroTitle: "استخدم RiskNova كتطبيق على الجوال وسطح المكتب",
      heroBody:
        "أضف RiskNova إلى الشاشة الرئيسية أو سطح المكتب على iOS وAndroid وWindows. تصل تحديثات الموقع تلقائيًا إلى التجربة المثبتة.",
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
          text: "افتح في Safari؛ عبر مشاركة → إضافة إلى الشاشة الرئيسية أنشئ الأيقونة.",
          step1: "افتح الموقع في Safari",
          step2: "اضغط مشاركة",
          step3: "اختر إضافة إلى الشاشة الرئيسية",
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
      publicDescription: "افتح بسرعة في نافذة منفصلة على iOS وAndroid وWindows.",
      publicButton: "تثبيت التطبيق",
      appTitle: "ثبّت تطبيق RiskNova",
      appDescription: "ارجع إلى الميدان والمستندات وNova من الشاشة الرئيسية.",
      appButton: "تثبيت",
      iosHint: "على iPhone/iPad: مشاركة → إضافة إلى الشاشة الرئيسية.",
      asideAria: "تثبيت تطبيق RiskNova",
      dismissAria: "إغلاق تذكير التثبيت",
    },
  },
  zh: {
    pwaInstallPage: {
      metaTitle: "RiskNova 应用",
      metaDescription: "在 iOS、Android 和 Windows 上将 RiskNova 安装为 PWA，无需应用商店。",
      eyebrow: "无需应用商店",
      heroTitle: "在移动端和桌面端像应用一样使用 RiskNova",
      heroBody:
        "在 iOS、Android 和 Windows 上将 RiskNova 添加到主屏幕或桌面。网站更新会自动同步到已安装的体验。",
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
          text: "在 Safari 中打开；通过共享 → 添加到主屏幕创建图标。",
          step1: "在 Safari 中打开网站",
          step2: "轻点共享图标",
          step3: "选择添加到主屏幕",
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
      publicDescription: "在 iOS、Android 和 Windows 上快速以独立窗口打开。",
      publicButton: "安装应用",
      appTitle: "安装 RiskNova 应用",
      appDescription: "从主屏幕返回现场、文档与 Nova 流程。",
      appButton: "安装",
      iosHint: "在 iPhone/iPad 上：共享 → 添加到主屏幕。",
      asideAria: "RiskNova 应用安装",
      dismissAria: "关闭安装提醒",
    },
  },
  ja: {
    pwaInstallPage: {
      metaTitle: "RiskNova アプリ",
      metaDescription:
        "RiskNova を iOS・Android・Windows でストアなしの PWA としてインストール。",
      eyebrow: "ストア不要",
      heroTitle: "モバイルとデスクトップでアプリのように RiskNova を使う",
      heroBody:
        "iOS・Android・Windows でホーム画面やデスクトップに追加。サイトの更新はインストールした体験にも自動で反映されます。",
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
          text: "Safari で開き、共有 → ホーム画面に追加でアイコンを作成します。",
          step1: "Safari でサイトを開く",
          step2: "共有アイコンをタップ",
          step3: "ホーム画面に追加を選択",
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
      publicDescription: "iOS・Android・Windows で別ウィンドウからすばやく開けます。",
      publicButton: "アプリをインストール",
      appTitle: "RiskNova アプリをインストール",
      appDescription: "ホーム画面から現場・ドキュメント・Nova に戻れます。",
      appButton: "インストール",
      iosHint: "iPhone/iPad：共有 → ホーム画面に追加。",
      asideAria: "RiskNova アプリのインストール",
      dismissAria: "インストールのリマインダーを閉じる",
    },
  },
  ko: {
    pwaInstallPage: {
      metaTitle: "RiskNova 앱",
      metaDescription:
        "iOS, Android, Windows에서 앱 스토어 없이 RiskNova를 PWA로 설치하세요.",
      eyebrow: "스토어 불필요",
      heroTitle: "모바일과 데스크톱에서 앱처럼 RiskNova 사용",
      heroBody:
        "iOS, Android, Windows에서 홈 화면이나 데스크톱에 추가하세요. 웹 업데이트가 설치된 환경에도 자동으로 반영됩니다.",
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
          text: "Safari에서 열고 공유 → 홈 화면에 추가로 아이콘을 만드세요.",
          step1: "Safari에서 사이트 열기",
          step2: "공유 아이콘 탭",
          step3: "홈 화면에 추가 선택",
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
      publicDescription: "iOS, Android, Windows에서 별도 창으로 빠르게 엽니다.",
      publicButton: "앱 설치",
      appTitle: "RiskNova 앱 설치",
      appDescription: "홈 화면에서 현장, 문서, Nova로 돌아가세요.",
      appButton: "설치",
      iosHint: "iPhone/iPad: 공유 → 홈 화면에 추가.",
      asideAria: "RiskNova 앱 설치",
      dismissAria: "설치 알림 닫기",
    },
  },
  hi: {
    pwaInstallPage: {
      metaTitle: "RiskNova ऐप",
      metaDescription:
        "iOS, Android और Windows पर बिना ऐप स्टोर के RiskNova को PWA के रूप में इंस्टॉल करें।",
      eyebrow: "ऐप स्टोर की ज़रूरत नहीं",
      heroTitle: "मोबाइल और डेस्कटॉप पर RiskNova को ऐप की तरह उपयोग करें",
      heroBody:
        "iOS, Android और Windows पर RiskNova को होम स्क्रीन या डेस्कटॉप पर जोड़ें। साइट अपडेट स्वचालित रूप से इंस्टॉल अनुभव में आ जाते हैं।",
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
          text: "Safari में खोलें; शेयर → होम स्क्रीन पर जोड़ें से आइकन बनाएं।",
          step1: "Safari में साइट खोलें",
          step2: "शेयर आइकन टैप करें",
          step3: "होम स्क्रीन पर जोड़ें चुनें",
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
      publicDescription: "iOS, Android और Windows पर अलग विंडो में तेज़ी से खोलें।",
      publicButton: "ऐप इंस्टॉल करें",
      appTitle: "RiskNova ऐप इंस्टॉल करें",
      appDescription: "होम स्क्रीन से फ़ील्ड, दस्तावेज़ और Nova पर लौटें।",
      appButton: "इंस्टॉल करें",
      iosHint: "iPhone/iPad: शेयर → होम स크्रीन पर जोड़ें।",
      asideAria: "RiskNova ऐप इंस्टॉलेशन",
      dismissAria: "इंस्टॉल रिमाइंडर बंद करें",
    },
  },
  az: {
    pwaInstallPage: {
      metaTitle: "RiskNova tətbiqi",
      metaDescription:
        "RiskNova-nı iOS, Android və Windows-da mağaza olmadan PWA kimi quraşdırın.",
      eyebrow: "Mağaza tələb olunmur",
      heroTitle: "RiskNova-nı mobil və masaüstündə tətbiq kimi istifadə edin",
      heroBody:
        "iOS, Android və Windows-da RiskNova-nı ana ekran və ya masaüstünə əlavə edin. Sayt yeniləmələri quraşdırılmış təcrübəyə avtomatik ötürülür.",
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
          text: "Safari ilə açın; Paylaş menyusundan Ana ekrana əlavə et ilə ikon yaradın.",
          step1: "Safari-də saytı aç",
          step2: "Paylaş ikonuna toxun",
          step3: "Ana ekrana əlavə et seç",
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
      publicDescription: "iOS, Android və Windows-da ayrıca pəncərədə tez aç.",
      publicButton: "Cihaza quraşdır",
      appTitle: "RiskNova tətbiqini quraşdır",
      appDescription: "Saha, sənəd və Nova axınlarına ana ekrandan qayıt.",
      appButton: "Quraşdır",
      iosHint: "iPhone/iPad üçün Paylaşdan Ana ekrana əlavə et istifadə et.",
      asideAria: "RiskNova tətbiq quraşdırması",
      dismissAria: "Quraşdırma xatırladıcısını bağla",
    },
  },
  id: {
    pwaInstallPage: {
      metaTitle: "Aplikasi RiskNova",
      metaDescription:
        "Pasang RiskNova sebagai PWA di iOS, Android, dan Windows tanpa toko aplikasi.",
      eyebrow: "Tanpa toko aplikasi",
      heroTitle: "Gunakan RiskNova seperti aplikasi di mobile dan desktop",
      heroBody:
        "Tambahkan RiskNova ke layar beranda atau desktop di iOS, Android, dan Windows. Pembaruan situs otomatis sampai ke pengalaman yang terpasang.",
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
          text: "Buka di Safari; lewat Bagikan → Tambahkan ke Layar Utama buat ikon.",
          step1: "Buka situs di Safari",
          step2: "Ketuk ikon Bagikan",
          step3: "Pilih Tambahkan ke Layar Utama",
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
      publicDescription: "Buka cepat di jendela terpisah di iOS, Android, dan Windows.",
      publicButton: "Pasang aplikasi",
      appTitle: "Pasang aplikasi RiskNova",
      appDescription: "Kembali ke lapangan, dokumen, dan Nova dari layar beranda.",
      appButton: "Pasang",
      iosHint: "Di iPhone/iPad: Bagikan → Tambahkan ke Layar Utama.",
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
