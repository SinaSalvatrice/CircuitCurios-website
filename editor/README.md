# CircuitCurios Webeditor: Silex

The previous custom/Hugo editor has been removed.

The editor is now the upstream Silex visual website builder:
https://github.com/silexlabs/Silex

## Install

From the website repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\editor\install-silex.ps1
```

This clones the official Silex repository, including its submodules, into
`editor/.silex-runtime/`, installs dependencies, and builds Silex.

## Start

```powershell
powershell -ExecutionPolicy Bypass -File .\editor\start-silex.ps1
```

Then open:

`http://localhost:6805`

The public CircuitCurios website in the repository root remains unchanged.
Silex is only the editing environment.
