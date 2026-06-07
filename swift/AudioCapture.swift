import Foundation
import ScreenCaptureKit
import AVFoundation

@available(macOS 13.0, *)
class AudioCapture: NSObject, SCStreamDelegate, SCStreamOutput {
    private var stream: SCStream?
    private var isRunning = false

    override init() {
        super.init()
    }

    func start() async throws {
        let content = try await SCShareableContent.excludingDesktopWindows(
            false,
            onScreenWindowsOnly: false
        )

        let config = SCStreamConfiguration()
        config.capturesAudio = true
        config.excludesCurrentProcessAudio = true
        config.sampleRate = 16000
        config.channelCount = 1

        let filter = SCContentFilter(
            display: content.displays[0],
            excludingApplications: [],
            exceptingWindows: []
        )

        stream = SCStream(filter: filter, configuration: config, delegate: self)
        try stream?.addStreamOutput(
            self,
            type: .audio,
            sampleHandlerQueue: DispatchQueue.global()
        )
        try await stream?.startCapture()
        isRunning = true

        FileHandle.standardError.write("AUDIO_STARTED\n".data(using: .utf8)!)
    }

    func stop() async throws {
        try await stream?.stopCapture()
        isRunning = false
        FileHandle.standardError.write("AUDIO_STOPPED\n".data(using: .utf8)!)
    }

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of type: SCStreamOutputType
    ) {
        guard type == .audio else { return }
        guard let data = extractPCMData(from: sampleBuffer) else { return }

        FileHandle.standardOutput.write(data)
    }

    private func extractPCMData(from sampleBuffer: CMSampleBuffer) -> Data? {
        guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
            return nil
        }
        var length = 0
        var dataPointer: UnsafeMutablePointer<Int8>?
        CMBlockBufferGetDataPointer(
            blockBuffer,
            atOffset: 0,
            lengthAtOffsetOut: nil,
            totalLengthOut: &length,
            dataPointerOut: &dataPointer
        )
        guard let pointer = dataPointer else { return nil }
        return Data(bytes: pointer, count: length)
    }

    func stream(
        _ stream: SCStream,
        didStopWithError error: Error
    ) {
        FileHandle.standardError.write(
            "AUDIO_ERROR: \(error)\n".data(using: .utf8)!
        )
    }
}

@available(macOS 13.0, *)
class Main {
    static func run() async {
        let capture = AudioCapture()
        do {
            try await capture.start()
            try await Task.sleep(nanoseconds: UInt64.max)
        } catch {
            FileHandle.standardError.write(
                "Failed: \(error)\n".data(using: .utf8)!
            )
            exit(1)
        }
    }
}

if #available(macOS 13.0, *) {
    Task {
        await Main.run()
    }
    RunLoop.main.run()
} else {
    FileHandle.standardError.write(
        "Requires macOS 13+\n".data(using: .utf8)!
    )
    exit(1)
}
