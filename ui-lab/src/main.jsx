import React, { Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@designcodeio/threeui/style.css';
import './index.css';

// Import actual public ThreeUI Community exports by subpath.
// The upstream README still mentions AtTheHorizon, but v1.2.0 does not export it.
const CircleButtons = React.lazy(() =>
  import('@designcodeio/threeui/components/CircleButtons').then(({ CircleButtons }) => {
    if (typeof CircleButtons !== 'function') throw new Error('ThreeUI CircleButtons export not found');
    return { default: CircleButtons };
  })
);
const EmeraldHorizonBackground = React.lazy(() =>
  import('@designcodeio/threeui/components/EmeraldHorizonBackground').then(({ EmeraldHorizonBackground }) => {
    if (typeof EmeraldHorizonBackground !== 'function') throw new Error('ThreeUI EmeraldHorizonBackground export not found');
    return { default: EmeraldHorizonBackground };
  })
);

class DemoErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('ThreeUI preview failed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <p role="alert" className="preview-error">
          تعذّر عرض هذا التأثير في المتصفح. التفاصيل: {this.state.error.message}
        </p>
      );
    }
    return this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

function App() {
  const [threeVisible, setThreeVisible] = useState(false);
  const [demo, setDemo] = useState('button');
  const [tapCount, setTapCount] = useState(0);
  const [webgl] = useState(supportsWebGL);
  const [reducedMotion] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );

  return (
    <main>
      <p className="muted">HAMDI PHOTOGRAPHY / UI LAB</p>
      <h1>تجارب التصميم بعيدًا عن الموقع المباشر</h1>
      <p>مساحة تطوير مستقلة لتجربة ThreeUI وSkiper UI. لا تغيّر «نور» أو الحجز أو خدمات الموقع.</p>
      <div className="lab-actions">
        <button
          type="button"
          aria-expanded={threeVisible}
          aria-controls="threeui-preview"
          onClick={() => setThreeVisible(value => !value)}
        >
          {threeVisible ? 'إخفاء معاينة ThreeUI' : 'عرض مكوّن ThreeUI'}
        </button>
      </div>

      {threeVisible && (
        <section id="threeui-preview" className="lab-panel" aria-label="معاينة ThreeUI">
          <h2>مكوّنات ThreeUI Community</h2>
          <p>اختر نموذجًا مجانيًا موجودًا فعلًا في المكتبة.</p>
          <div className="lab-actions" role="group" aria-label="نوع المكوّن">
            <button
              type="button"
              className={demo === 'button' ? 'is-selected' : ''}
              aria-pressed={demo === 'button'}
              onClick={() => setDemo('button')}
            >
              زر متحرك
            </button>
            <button
              type="button"
              className={demo === 'horizon' ? 'is-selected' : ''}
              aria-pressed={demo === 'horizon'}
              onClick={() => setDemo('horizon')}
            >
              خلفية Emerald Horizon
            </button>
          </div>
          {demo === 'button' ? (
            <div className="lab-demo lab-demo--button" aria-label="معاينة زر ThreeUI">
              <DemoErrorBoundary key="button">
                <Suspense fallback={<p role="status">جارٍ تحميل مكوّن الزر...</p>}>
                  <CircleButtons
                    variant="plus"
                    mode="dark"
                    ariaLabel="تجربة زر ThreeUI"
                    onClick={() => setTapCount(count => count + 1)}
                  />
                </Suspense>
              </DemoErrorBoundary>
              <p aria-live="polite">عدد الضغطات التجريبية: {tapCount}</p>
            </div>
          ) : (
            <div className="lab-demo lab-demo--horizon" aria-label="معاينة خلفية ThreeUI">
              {!webgl ? (
                <p className="preview-error" role="status">هذا المتصفح لا يدعم WebGL. تجربة الزر المتحرك متاحة بدون WebGL.</p>
              ) : reducedMotion ? (
                <p role="status">احترامًا لإعداد تقليل الحركة، تم إيقاف الخلفية المتحركة. جرّب الزر بدلًا منها.</p>
              ) : (
                <DemoErrorBoundary key="horizon">
                  <Suspense fallback={<p role="status">جارٍ تحميل الخلفية...</p>}>
                    <EmeraldHorizonBackground speed={0.65} waveScale={0.7} glow={0.7} />
                  </Suspense>
                </DemoErrorBoundary>
              )}
            </div>
          )}
          <p className="muted">هذي مجرد تجارب داخل ui-lab، مو إضافات على الموقع المنشور.</p>
        </section>
      )}

      <section className="lab-panel">
        <h2>Skiper UI</h2>
        <p>بعد التثبيت المحلي، شغّل <code>npm run add:skiper</code> لإضافة المكوّن المجاني عبر مكتبة shadcn. بعض المكوّنات تتطلب ترخيص Pro.</p>
        <small>Free Skiper UI components require attribution: skiper-ui.com.</small>
      </section>
      <section className="lab-panel">
        <h2>Animmaster Lib</h2>
        <p>المكتبة توفّر ملفات مكوّنات مستقلة، وليست حزمة npm عامة. تحتاج ملفات المكوّن المرخّص لاستخدامه هنا.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
