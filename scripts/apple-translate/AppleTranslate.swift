// A tiny macOS SwiftUI app that runs Apple's on-device translator over a JSON job and exits.
// TranslationSession is only handed out inside a SwiftUI view (.translationTask), hence the window.
//
//   AppleTranslate status <from> <to> [<to>...]   prints one line per pair: installed | supported | unsupported
//   AppleTranslate run <job.json> <out.json>      job: {"from":"en","to":"es","strings":[...]}
//                                                 out: {"translations":[...]} in the same order ("" where one failed)
import Foundation
import SwiftUI
import Translation

struct Job: Decodable { let from: String; let to: String; let strings: [String] }

let args = CommandLine.arguments
let BATCH = 150

func log(_ message: String) {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
}

func fail(_ message: String) -> Never {
  log(message)
  exit(1)
}

/// Started from a shell, a SwiftUI App scene opens no window, so the window hosting the view is made here by hand.
final class AppDelegate: NSObject, NSApplicationDelegate {
  var window: NSWindow?
  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.accessory)
    guard args[1] == "run" else { return }
    let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 320, height: 80),
                     styleMask: [.titled], backing: .buffered, defer: false)
    w.title = "Translating"
    w.isReleasedWhenClosed = false
    w.contentView = NSHostingView(rootView: Runner())
    w.center()
    w.orderFrontRegardless()
    window = w
  }
}

@main
enum Main {
  static func main() {
    guard args.count >= 2 else { fail("usage: AppleTranslate status|run ...") }
    if args[1] == "status" {
      guard args.count >= 4 else { fail("usage: AppleTranslate status <from> <to>...") }
      let from = Locale.Language(identifier: args[2])
      let targets = Array(args[3...])
      Task {
        let availability = LanguageAvailability()
        for to in targets {
          let status = await availability.status(from: from, to: Locale.Language(identifier: to))
          let word: String
          switch status {
          case .installed: word = "installed"
          case .supported: word = "supported"
          case .unsupported: word = "unsupported"
          @unknown default: word = "unknown"
          }
          print("\(args[2])->\(to) \(word)")
        }
        exit(0)
      }
    }
    let app = NSApplication.shared
    let delegate = AppDelegate()
    app.delegate = delegate
    app.run()
  }
}

struct Runner: View {
  @State private var job: Job?
  @State private var config: TranslationSession.Configuration?
  @State private var done = 0

  var body: some View {
    Text(job.map { "\($0.from) → \($0.to): \(done) / \($0.strings.count)" } ?? "Starting…")
      .padding()
      .task { load() }
      .translationTask(config) { session in
        guard let job else { return }
        await translate(job, with: session)
      }
  }

  private func load() {
    guard args.count >= 4, args[1] == "run" else { return }
    do {
      let data = try Data(contentsOf: URL(fileURLWithPath: args[2]))
      let j = try JSONDecoder().decode(Job.self, from: data)
      job = j
      config = .init(source: Locale.Language(identifier: j.from), target: Locale.Language(identifier: j.to))
      log("loaded \(j.strings.count) strings \(j.from)->\(j.to)")
    } catch { fail("bad job: \(error)") }
  }

  private func translate(_ job: Job, with session: TranslationSession) async {
    var out = Array(repeating: "", count: job.strings.count)
    do {
      try await session.prepareTranslation()
      let strings = job.strings
      // CONC batches run at once on the one session (the translator is faster with several in flight).
      let conc = Int(ProcessInfo.processInfo.environment["CONC"] ?? "") ?? 4
      let batch = Int(ProcessInfo.processInfo.environment["BATCH"] ?? "") ?? BATCH
      let ranges = stride(from: 0, to: strings.count, by: batch).map { $0..<min($0 + batch, strings.count) }
      var next = 0
      await withTaskGroup(of: [(Int, String)].self) { group in
        func add(_ r: Range<Int>) {
          group.addTask {
            let requests = r.map { TranslationSession.Request(sourceText: strings[$0], clientIdentifier: String($0)) }
            if let responses = try? await session.translations(from: requests) {
              return responses.compactMap { resp in resp.clientIdentifier.flatMap(Int.init).map { ($0, resp.targetText) } }
            }
            // One bad string can fail the batch: retry it one string at a time.
            var one: [(Int, String)] = []
            for i in r { if let t = try? await session.translate(strings[i]) { one.append((i, t.targetText)) } }
            return one
          }
        }
        while next < min(conc, ranges.count) { add(ranges[next]); next += 1 }
        for await part in group {
          for (i, t) in part { out[i] = t }
          done += part.count
          log("\(done)/\(strings.count)")
          if next < ranges.count { add(ranges[next]); next += 1 }
        }
      }
      let data = try JSONEncoder().encode(["translations": out])
      try data.write(to: URL(fileURLWithPath: args[3]))
      exit(0)
    } catch { fail("translation failed: \(error)") }
  }
}
