import { Component, Suspense, type ReactNode } from "react";

interface SceneErrorBoundaryProps {
  children: ReactNode;
  /** Render-tree fallback when a lazy resource (GLB / KTX2) rejects: 404, decode failure, transcode error. Default: null. */
  fallback?: ReactNode;
  /** Suspense fallback while the resource is still loading. Default: null (matches existing <Suspense fallback={null}>). */
  suspenseFallback?: ReactNode;
  /** Optional label surfaced in the dev-only console warning when the boundary fires. */
  name?: string;
}

interface SceneErrorBoundaryState {
  failed: boolean;
}

/**
 * 通用场景错误边界（fv-66y.14）。
 *
 * 背景：<Suspense> 只捕获 thrown promise（资源"在加载"），不捕获 rejection
 * （404 / 解码失败 / transcode 错）。一旦 useLoader(KTX2Loader) 或 useGLTF 抛错，
 * 错误冒泡越过 <Suspense> 到 React 顶 → 卸载整树 → 全屏空白。这正是 KTX2 race
 * bug 的故障画像（见 6033ab7）。此边界补上那一层：rejected 资源降级到 fallback，
 * 让演示继续而不是空白。
 *
 * 用法参照 SafeDrone / SafePhotographicHorizon 的内联 class 模式，但抽出复用，
 * 使单个 hero 资产失败时只降级它自己，而非杀全局：
 *
 *   <SceneErrorBoundary name="PumpStation">
 *     <HeroPumpSkid />
 *   </SceneErrorBoundary>
 *
 * 实例化后边界内置 <Suspense>，所以不需要再外层包一层。
 */
export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // GLB/KTX2 404 或 transcode 失败在此落地。dev 控制台 warn 让操作员看见；
    // 过程化 fallback（或 null）让演示继续。生产构建静默——状态已通过 fallback 表达。
    if (import.meta.env.DEV) {
      console.warn(
        `[SceneErrorBoundary${this.props.name ? `:${this.props.name}` : ""}] scene subtree fell back:`,
        error,
      );
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return (
      <Suspense fallback={this.props.suspenseFallback ?? null}>
        {this.props.children}
      </Suspense>
    );
  }
}
