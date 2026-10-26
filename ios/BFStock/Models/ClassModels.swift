import Foundation

// MARK: - Classroom mode (student side, /api/classes)

/// What a join code points to, shown before joining.
struct ClassInfo: Decodable, Equatable {
    let code: String
    let name: String
    let teacherName: String?
    let students: Int
}

struct ClassJoined: Decodable {
    let id: String
    let name: String
}

struct StudentClassList: Decodable {
    let classes: [StudentClass]
}

/// A class this device has joined, with its assignments and the class leaderboard.
struct StudentClass: Decodable, Identifiable, Equatable {
    let id: String
    let code: String
    let name: String
    let teacherName: String?
    let nickname: String
    let assignments: [ClassAssignment]
    let leaderboard: [ClassBoardRow]
}

/// Completes on its own: a learning mission done in the paper account, or a time-machine scenario finished.
struct ClassAssignment: Decodable, Identifiable, Equatable {
    let id: String
    let type: String           // "mission" or "time_machine"
    let ref: String            // learning mission id or time-machine scenario id
    let due: String?           // yyyy-MM-dd
    let title: String
    let detail: String?
    let done: Bool

    var isTimeMachine: Bool { type == "time_machine" }
}

struct ClassBoardRow: Decodable, Equatable {
    let nickname: String
    let missions: Int
    let done: Int
    let returnPct: Double?     // US account, or the A-share one when the student has not traded US stocks
    let me: Bool
}

struct ClassJoinBody: Encodable {
    let code: String
    let deviceId: String
    let nickname: String
}

struct ClassStudentBody: Encodable {
    let deviceId: String
    let lang: String
}

struct ClassLeaveBody: Encodable {
    let classId: String
    let deviceId: String
}

/// Invite links: https://bestfriendstock.com/class/CODE (universal links, see BFStock.entitlements).
enum ClassLink {
    static func code(from url: URL) -> String? {
        guard let host = url.host?.lowercased(), host == "bestfriendstock.com" || host == "www.bestfriendstock.com" else { return nil }
        let parts = url.pathComponents.filter { $0 != "/" }
        guard parts.count == 2, parts[0].lowercased() == "class" else { return nil }
        let code = parts[1].uppercased()
        return code.count == 6 && code.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber) }) ? code : nil
    }
}
