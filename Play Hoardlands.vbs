' Launches Hoardlands: starts the local game server with no console window (a second
' copy exits on its own if the server is already running), then opens the game in the
' default browser.
Option Explicit
Dim sh, fso, dir
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
' its own port, separate from the 8642 dev server used while building the game
sh.Run "pythonw """ & dir & "\serve.py"" 8650", 0, False
WScript.Sleep 1200
sh.Run "http://localhost:8650"
