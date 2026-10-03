import UIKit
import Capacitor
import SwiftUI
#if canImport(Translation)
import Translation
#endif

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ReadFluentBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// MARK: - The app's own plugins

/// The bridge, with the app's own plugins registered (they live in this file so the Xcode project needs no new entries).
class ReadFluentBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(OnDeviceTranslatePlugin())
    }
}

/// Books in the language being learned, translated by the phone itself (Apple's Translation framework,
/// iOS 18+): free, offline and private. lib/translate/device.ts is the JavaScript side.
/// status -> "ready" | "download" | "unsupported"; prepare -> asks iOS to download the language; translate -> texts.
@objc(OnDeviceTranslatePlugin)
public class OnDeviceTranslatePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OnDeviceTranslatePlugin"
    public let jsName = "OnDeviceTranslate"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "translate", returnType: CAPPluginReturnPromise),
    ]

    /// The app's language codes as Apple names them.
    private func appleCode(_ code: String) -> String {
        switch code {
        case "zh": return "zh-Hans"
        case "pt": return "pt-BR"
        default: return code
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        guard #available(iOS 18.0, *) else { call.resolve(["status": "unsupported"]); return }
        let from = Locale.Language(identifier: appleCode(call.getString("from") ?? "en"))
        let to = Locale.Language(identifier: appleCode(call.getString("to") ?? "en"))
        Task {
            let status = await LanguageAvailability().status(from: from, to: to)
            switch status {
            case .installed: call.resolve(["status": "ready"])
            case .supported: call.resolve(["status": "download"])
            default: call.resolve(["status": "unsupported"])
            }
        }
    }

    @objc func prepare(_ call: CAPPluginCall) {
        guard #available(iOS 18.0, *) else { call.resolve(["ready": false]); return }
        let from = Locale.Language(identifier: appleCode(call.getString("from") ?? "en"))
        let to = Locale.Language(identifier: appleCode(call.getString("to") ?? "en"))
        Task { @MainActor in
            do {
                try await TranslationHost.run(from: from, to: to, in: self.bridge?.viewController) { session in
                    try await session.prepareTranslation()
                }
                call.resolve(["ready": true])
            } catch {
                call.resolve(["ready": false])
            }
        }
    }

    @objc func translate(_ call: CAPPluginCall) {
        guard #available(iOS 18.0, *) else { call.reject("unsupported"); return }
        let texts = (call.getArray("texts") as? [String]) ?? []
        let from = Locale.Language(identifier: appleCode(call.getString("from") ?? "en"))
        let to = Locale.Language(identifier: appleCode(call.getString("to") ?? "en"))
        if texts.isEmpty { call.resolve(["texts": []]); return }
        Task { @MainActor in
            var out = texts
            do {
                try await TranslationHost.run(from: from, to: to, in: self.bridge?.viewController) { session in
                    let requests = texts.enumerated().map { TranslationSession.Request(sourceText: $0.element, clientIdentifier: String($0.offset)) }
                    let responses = try await session.translations(from: requests)
                    for r in responses {
                        if let id = r.clientIdentifier, let i = Int(id), i < out.count { out[i] = r.targetText }
                    }
                }
                call.resolve(["texts": out])
            } catch {
                call.reject("translation failed: \(error.localizedDescription)")
            }
        }
    }
}

/// Apple hands out a TranslationSession only inside a SwiftUI view, so a one-point, invisible view is added
/// to the bridge for the length of one piece of work and removed again.
@available(iOS 18.0, *)
@MainActor
enum TranslationHost {
    static func run(from: Locale.Language, to: Locale.Language, in parent: UIViewController?,
                    work: @escaping (TranslationSession) async throws -> Void) async throws {
        guard let parent = parent else { throw NSError(domain: "OnDeviceTranslate", code: 1) }
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            var host: UIHostingController<HostView>?
            var finished = false
            let view = HostView(configuration: TranslationSession.Configuration(source: from, target: to)) { session in
                do { try await work(session); if !finished { finished = true; cont.resume() } }
                catch { if !finished { finished = true; cont.resume(throwing: error) } }
                await MainActor.run {
                    host?.willMove(toParent: nil)
                    host?.view.removeFromSuperview()
                    host?.removeFromParent()
                }
            }
            let h = UIHostingController(rootView: view)
            host = h
            h.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
            h.view.isUserInteractionEnabled = false
            h.view.backgroundColor = .clear
            parent.addChild(h)
            parent.view.addSubview(h.view)
            h.didMove(toParent: parent)
        }
    }

    struct HostView: View {
        let configuration: TranslationSession.Configuration
        let work: (TranslationSession) async -> Void
        var body: some View {
            Color.clear.frame(width: 1, height: 1)
                .translationTask(configuration) { session in await work(session) }
        }
    }
}
