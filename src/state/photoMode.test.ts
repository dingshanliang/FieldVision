import { beforeEach, describe, expect, it } from "vitest";
import { useFarmStore } from "./useFarmStore";

/**
 * 照片模式接管播放（fv-photo P0 伴随修复）：进入照片模式必须复用 paused
 * 冻结章节时间（不发明第三种暂停态），退出时恢复进入前的暂停态；曝光/
 * 定格/FOV 在进出时复位；letterbox 出片选项独立可切。
 */
describe("photo mode pause takeover", () => {
  beforeEach(() => {
    useFarmStore.setState({
      photoMode: false,
      photoFrozen: false,
      photoExposure: 1,
      photoFov: null,
      photoCaptureTick: 0,
      photoLetterbox: true,
      photoPriorPaused: false,
      paused: false,
    });
  });

  it("pauses the demo while composing and restores the running state on exit", () => {
    useFarmStore.getState().setPhotoMode(true);
    expect(useFarmStore.getState().photoMode).toBe(true);
    expect(useFarmStore.getState().paused).toBe(true);
    expect(useFarmStore.getState().photoPriorPaused).toBe(false);

    useFarmStore.getState().setPhotoMode(false);
    expect(useFarmStore.getState().photoMode).toBe(false);
    expect(useFarmStore.getState().paused).toBe(false);
  });

  it("restores a demo that was already paused before entering photo mode", () => {
    useFarmStore.setState({ paused: true });
    useFarmStore.getState().setPhotoMode(true);
    expect(useFarmStore.getState().paused).toBe(true);
    expect(useFarmStore.getState().photoPriorPaused).toBe(true);

    useFarmStore.getState().setPhotoMode(false);
    expect(useFarmStore.getState().paused).toBe(true);
  });

  it("resets exposure, freeze and fov on both enter and exit", () => {
    useFarmStore.setState({ photoExposure: 1.4, photoFov: 30, photoFrozen: true });
    useFarmStore.getState().setPhotoMode(true);
    expect(useFarmStore.getState().photoExposure).toBe(1);
    expect(useFarmStore.getState().photoFov).toBeNull();
    expect(useFarmStore.getState().photoFrozen).toBe(false);

    useFarmStore.getState().setPhotoExposure(1.3);
    useFarmStore.getState().setPhotoFov(28);
    useFarmStore.getState().setPhotoFrozen(true);
    useFarmStore.getState().setPhotoMode(false);
    expect(useFarmStore.getState().photoExposure).toBe(1);
    expect(useFarmStore.getState().photoFov).toBeNull();
    expect(useFarmStore.getState().photoFrozen).toBe(false);
  });

  it("keeps the letterbox export option independent of mode switches", () => {
    expect(useFarmStore.getState().photoLetterbox).toBe(true);
    useFarmStore.getState().setPhotoLetterbox(false);
    useFarmStore.getState().setPhotoMode(true);
    expect(useFarmStore.getState().photoLetterbox).toBe(false);
    useFarmStore.getState().setPhotoMode(false);
    expect(useFarmStore.getState().photoLetterbox).toBe(false);
  });
});
