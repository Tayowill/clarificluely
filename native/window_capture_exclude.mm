#include <node_api.h>

#import <Cocoa/Cocoa.h>
#import <CoreGraphics/CoreGraphics.h>

// Private WindowServer APIs used by Chromium for macOS 15+ capture exclusion.
typedef uint32_t CGSConnectionID;
typedef NSInteger CGSWindowID;
typedef CFTypeRef CGRegionRef;

extern "C" {
CGSConnectionID CGSMainConnectionID(void);
CGError CGSSetWindowCaptureExcludeShape(CGSConnectionID cid, CGSWindowID wid, CGRegionRef region);
CGError CGSGetWindowBounds(CGSConnectionID cid, CGSWindowID wid, CGRect* rectOut);
CGRegionRef CGRegionCreateWithRect(CGRect rect);
void CGRegionRelease(CGRegionRef region);
}

static NSWindow* WindowFromElectronHandle(napi_env env, napi_value handleArg) {
  void* bufferData = nullptr;
  size_t length = 0;
  if (napi_get_buffer_info(env, handleArg, &bufferData, &length) != napi_ok) {
    return nil;
  }
  if (bufferData == nullptr || length < sizeof(void*)) {
    return nil;
  }

  NSView* view = *static_cast<NSView**>(bufferData);
  if (view == nil) {
    return nil;
  }
  return [view window];
}

static CGRect CaptureExcludeRect(CGSConnectionID connection, CGSWindowID windowId, NSWindow* window) {
  CGRect bounds = CGRectZero;
  if (CGSGetWindowBounds(connection, windowId, &bounds) == kCGErrorSuccess &&
      bounds.size.width > 0 && bounds.size.height > 0) {
    bounds.origin = CGPointZero;
    return bounds;
  }

  CGRect frame = NSRectToCGRect([window frame]);
  frame.origin = CGPointZero;
  if (frame.size.width > 0 && frame.size.height > 0) {
    return frame;
  }

  NSRect content = [window contentRectForFrameRect:[window frame]];
  return CGRectMake(0, 0, content.size.width, content.size.height);
}

static bool ApplyCaptureExclusion(NSWindow* window, bool exclude) {
  if (window == nil) {
    return false;
  }

  CGSConnectionID connection = CGSMainConnectionID();
  CGSWindowID windowId = static_cast<CGSWindowID>([window windowNumber]);

  if (!exclude) {
    CGRect empty = CGRectMake(0, 0, 0, 0);
    CGRegionRef emptyRegion = CGRegionCreateWithRect(empty);
    if (emptyRegion != nullptr) {
      CGSSetWindowCaptureExcludeShape(connection, windowId, emptyRegion);
      CGRegionRelease(emptyRegion);
    }
    return CGSSetWindowCaptureExcludeShape(connection, windowId, nullptr) == kCGErrorSuccess;
  }

  CGRect frame = CaptureExcludeRect(connection, windowId, window);
  CGRegionRef region = CGRegionCreateWithRect(frame);
  if (region == nullptr) {
    return false;
  }
  CGError err = CGSSetWindowCaptureExcludeShape(connection, windowId, region);
  CGRegionRelease(region);
  return err == kCGErrorSuccess;
}

static napi_value SetCaptureExclude(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  if (napi_get_cb_info(env, info, &argc, args, nullptr, nullptr) != napi_ok || argc < 2) {
    napi_throw_type_error(env, nullptr, "Expected (nativeHandle: Buffer, exclude: boolean)");
    return nullptr;
  }

  bool exclude = false;
  if (napi_get_value_bool(env, args[1], &exclude) != napi_ok) {
    napi_throw_type_error(env, nullptr, "Second argument must be a boolean");
    return nullptr;
  }

  NSWindow* window = WindowFromElectronHandle(env, args[0]);
  bool ok = ApplyCaptureExclusion(window, exclude);

  napi_value result;
  napi_get_boolean(env, ok, &result);
  return result;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  napi_create_function(env, nullptr, 0, SetCaptureExclude, nullptr, &fn);
  napi_set_named_property(env, exports, "setCaptureExclude", fn);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
