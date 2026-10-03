package com.amanmarwaha.ReadFluent;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugins, registered before the bridge starts.
        registerPlugin(OnDeviceTranslatePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
