package com.amanmarwaha.ReadFluent;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.common.model.RemoteModelManager;
import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.TranslateRemoteModel;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Books in the language being learned, translated by the phone itself (Google ML Kit, on device): free,
 * offline and private. lib/translate/device.ts is the JavaScript side.
 * status -> "ready" | "download" | "unsupported"; prepare -> downloads the language models; translate -> texts.
 */
@CapacitorPlugin(name = "OnDeviceTranslate")
public class OnDeviceTranslatePlugin extends Plugin {

    private final Map<String, Translator> translators = new HashMap<>();

    private static String lang(String code) {
        return code == null ? null : TranslateLanguage.fromLanguageTag(code);
    }

    private Translator translator(String from, String to) {
        String key = from + ">" + to;
        Translator t = translators.get(key);
        if (t == null) {
            t = Translation.getClient(new TranslatorOptions.Builder().setSourceLanguage(from).setTargetLanguage(to).build());
            translators.put(key, t);
        }
        return t;
    }

    @PluginMethod
    public void status(PluginCall call) {
        String from = lang(call.getString("from", "en"));
        String to = lang(call.getString("to", "en"));
        if (from == null || to == null) {
            JSObject r = new JSObject();
            r.put("status", "unsupported");
            call.resolve(r);
            return;
        }
        RemoteModelManager mgr = RemoteModelManager.getInstance();
        Task<Boolean> a = mgr.isModelDownloaded(new TranslateRemoteModel.Builder(from).build());
        Task<Boolean> b = mgr.isModelDownloaded(new TranslateRemoteModel.Builder(to).build());
        Tasks.whenAllSuccess(a, b)
            .addOnSuccessListener(list -> {
                boolean ready = Boolean.TRUE.equals(list.get(0)) && Boolean.TRUE.equals(list.get(1));
                JSObject r = new JSObject();
                r.put("status", ready ? "ready" : "download");
                call.resolve(r);
            })
            .addOnFailureListener(e -> {
                JSObject r = new JSObject();
                r.put("status", "download");
                call.resolve(r);
            });
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        String from = lang(call.getString("from", "en"));
        String to = lang(call.getString("to", "en"));
        JSObject r = new JSObject();
        if (from == null || to == null) {
            r.put("ready", false);
            call.resolve(r);
            return;
        }
        translator(from, to)
            .downloadModelIfNeeded(new DownloadConditions.Builder().build())
            .addOnSuccessListener(v -> { r.put("ready", true); call.resolve(r); })
            .addOnFailureListener(e -> { r.put("ready", false); call.resolve(r); });
    }

    @PluginMethod
    public void translate(PluginCall call) {
        String from = lang(call.getString("from", "en"));
        String to = lang(call.getString("to", "en"));
        JSArray arr = call.getArray("texts");
        if (from == null || to == null || arr == null) {
            call.reject("unsupported");
            return;
        }
        List<String> texts;
        try {
            texts = arr.toList();
        } catch (Exception e) {
            call.reject("bad texts");
            return;
        }
        Translator t = translator(from, to);
        List<Task<String>> jobs = new ArrayList<>();
        for (String s : texts) jobs.add(t.translate(s));
        Tasks.whenAllSuccess(jobs)
            .addOnSuccessListener(results -> {
                JSArray out = new JSArray();
                for (Object o : results) out.put(o == null ? "" : o.toString());
                JSObject r = new JSObject();
                r.put("texts", out);
                call.resolve(r);
            })
            .addOnFailureListener(e -> call.reject("translation failed: " + e.getMessage()));
    }

    @Override
    protected void handleOnDestroy() {
        for (Translator t : translators.values()) t.close();
        translators.clear();
    }
}
