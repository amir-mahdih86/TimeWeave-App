package com.amir.timeweave

import android.os.Bundle

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Edge-to-edge intentionally disabled: keep app content below the status
    // bar so system icons never overlap the UI.
    super.onCreate(savedInstanceState)
  }
}
