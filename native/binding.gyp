{
  "targets": [
    {
      "target_name": "window_capture_exclude",
      "sources": ["window_capture_exclude.mm"],
      "conditions": [
        ["OS=='mac'", {
          "link_settings": {
            "libraries": [
              "-framework Cocoa",
              "-framework CoreGraphics"
            ]
          }
        }]
      ]
    }
  ]
}
