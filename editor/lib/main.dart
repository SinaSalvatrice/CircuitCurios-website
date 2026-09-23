import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path/path.dart' as p;
import 'package:webview_flutter_windows/webview_flutter_windows.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WebsiteStudioApp());
}

class WebsiteStudioApp extends StatelessWidget {
  const WebsiteStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF65686D),
      brightness: Brightness.dark,
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'CircuitCurios Website Studio',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: scheme,
        scaffoldBackgroundColor: const Color(0xFF111214),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          isDense: true,
        ),
      ),
      home: const WebsiteStudioHome(),
    );
  }
}

enum PreviewDevice { desktop, tablet, mobile }

class WebsiteStudioHome extends StatefulWidget {
  const WebsiteStudioHome({super.key});

  @override
  State<WebsiteStudioHome> createState() => _WebsiteStudioHomeState();
}

class _WebsiteStudioHomeState extends State<WebsiteStudioHome> {
  static const editableExtensions = <String>{
    '.html',
    '.css',
    '.js',
    '.svg',
    '.json',
    '.md',
    '.txt',
    '.xml',
  };

  final _codeController = TextEditingController();
  final _pageTitleController = TextEditingController();
  final _kickerController = TextEditingController();
  final _heroTitleController = TextEditingController();
  final _heroTextController = TextEditingController();
  final _paperController = TextEditingController();
  final _inkController = TextEditingController();
  final _darkController = TextEditingController();
  final _maxController = TextEditingController();
  final _padController = TextEditingController();

  Directory? _root;
  List<File> _files = const [];
  String? _selectedPath;
  WebviewController? _previewController;
  bool _previewReady = false;
  bool _busy = true;
  bool _dirty = false;
  Object? _previewError;
  String _status = 'Website wird gesucht ...';
  PreviewDevice _device = PreviewDevice.desktop;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void dispose() {
    _previewController?.dispose();
    _codeController.dispose();
    _pageTitleController.dispose();
    _kickerController.dispose();
    _heroTitleController.dispose();
    _heroTextController.dispose();
    _paperController.dispose();
    _inkController.dispose();
    _darkController.dispose();
    _maxController.dispose();
    _padController.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final root = _findWebsiteRoot();
    if (root == null) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _status = 'Website-Repo nicht automatisch gefunden.';
      });
      return;
    }
    await _setRoot(root);
  }

  Directory? _findWebsiteRoot() {
    final starts = <Directory>[
      Directory.current,
      File(Platform.resolvedExecutable).parent,
    ];
    final seen = <String>{};

    for (final start in starts) {
      var current = start.absolute;
      for (var depth = 0; depth < 12; depth++) {
        final normalized = p.normalize(current.path);
        if (seen.add(normalized) && _looksLikeWebsiteRoot(current)) {
          return current;
        }
        final parent = current.parent;
        if (p.equals(parent.path, current.path)) break;
        current = parent;
      }
    }
    return null;
  }

  bool _looksLikeWebsiteRoot(Directory directory) {
    return File(p.join(directory.path, 'index.html')).existsSync() &&
        File(p.join(directory.path, 'css', 'style.css')).existsSync();
  }

  Future<void> _chooseRoot() async {
    final selected = await FilePicker.platform.getDirectoryPath(
      dialogTitle: 'CircuitCurios Website-Repo auswählen',
    );
    if (selected == null) return;
    final directory = Directory(selected);
    if (!_looksLikeWebsiteRoot(directory)) {
      _showMessage('Dort wurden index.html und css/style.css nicht gefunden.');
      return;
    }
    await _setRoot(directory);
  }

  Future<void> _setRoot(Directory directory) async {
    setState(() {
      _busy = true;
      _root = directory;
      _status = 'Website wird geladen ...';
    });

    final files = await _collectEditableFiles(directory);
    files.sort((a, b) => p
        .relative(a.path, from: directory.path)
        .compareTo(p.relative(b.path, from: directory.path)));

    final preferred = File(p.join(directory.path, 'index.html'));
    final selected = preferred.existsSync()
        ? preferred
        : (files.isEmpty ? null : files.first);

    if (!mounted) return;
    setState(() {
      _files = files;
      _busy = false;
      _status = 'Bereit · ' + directory.path;
    });

    await _loadVisualFields();
    if (selected != null) {
      await _openFile(selected.path);
    }
    await _initializePreview();
  }

  Future<List<File>> _collectEditableFiles(Directory directory) async {
    final result = <File>[];

    Future<void> walk(Directory current) async {
      await for (final entity in current.list(followLinks: false)) {
        final name = p.basename(entity.path).toLowerCase();
        if (entity is Directory) {
          if (name == '.git' || name == 'editor' || name == 'build') {
            continue;
          }
          await walk(entity);
          continue;
        }
        if (entity is File &&
            editableExtensions.contains(p.extension(entity.path).toLowerCase())) {
          result.add(entity);
        }
      }
    }

    await walk(directory);
    return result;
  }

  Future<void> _openFile(String path) async {
    try {
      final content = await File(path).readAsString();
      if (!mounted) return;
      setState(() {
        _selectedPath = path;
        _codeController.text = content;
        _dirty = false;
        _status = 'Geöffnet · ' + _relative(path);
      });
    } catch (error) {
      _showMessage('Datei konnte nicht geöffnet werden: ' + error.toString());
    }
  }

  Future<void> _saveCode() async {
    final path = _selectedPath;
    if (path == null) return;
    try {
      await File(path).writeAsString(_codeController.text);
      if (!mounted) return;
      setState(() {
        _dirty = false;
        _status = 'Gespeichert · ' + _relative(path);
      });
      await _loadVisualFields();
      await _reloadPreview();
    } catch (error) {
      _showMessage('Speichern fehlgeschlagen: ' + error.toString());
    }
  }

  Future<void> _loadVisualFields() async {
    final root = _root;
    if (root == null) return;

    final index = await File(p.join(root.path, 'index.html')).readAsString();
    final css = await File(p.join(root.path, 'css', 'style.css')).readAsString();

    _pageTitleController.text = _plainMatch(
      index,
      RegExp(r'<title>([\s\S]*?)</title>', caseSensitive: false),
    );
    _kickerController.text = _plainMatch(
      index,
      RegExp(
        r'<p\s+class="kicker">([\s\S]*?)</p>',
        caseSensitive: false,
      ),
    );
    _heroTitleController.text = _plainMatch(
      index,
      RegExp(r'<h1>([\s\S]*?)</h1>', caseSensitive: false),
      preserveBreaks: true,
    );
    _heroTextController.text = _plainMatch(
      index,
      RegExp(
        r'<p\s+class="hero-text">([\s\S]*?)</p>',
        caseSensitive: false,
      ),
    );
    _paperController.text = _cssVariable(css, 'paper');
    _inkController.text = _cssVariable(css, 'ink');
    _darkController.text = _cssVariable(css, 'dark');
    _maxController.text = _cssVariable(css, 'max');
    _padController.text = _cssVariable(css, 'pad');
  }

  String _plainMatch(
    String source,
    RegExp expression, {
    bool preserveBreaks = false,
  }) {
    final match = expression.firstMatch(source);
    if (match == null) return '';
    var value = match.group(1) ?? '';
    if (preserveBreaks) {
      final raw = value
          .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
          .replaceAll(RegExp(r'<[^>]+>'), '');
      return _decodeHtml(raw).trim();
    }
    value = value.replaceAll(RegExp(r'<[^>]+>'), ' ');
    value = value.replaceAll(RegExp(r'\s+'), ' ').trim();
    return _decodeHtml(value);
  }

  String _decodeHtml(String value) {
    return value
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
  }

  String _escapeHtml(String value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
  }

  String _cssVariable(String css, String name) {
    final expression = RegExp(
      '--' + RegExp.escape(name) + r'\s*:\s*([^;]+);',
      caseSensitive: false,
    );
    return expression.firstMatch(css)?.group(1)?.trim() ?? '';
  }

  String _setCssVariable(String css, String name, String value) {
    final expression = RegExp(
      '(--' + RegExp.escape(name) + r'\s*:\s*)[^;]+;',
      caseSensitive: false,
    );
    if (!expression.hasMatch(css)) return css;
    return css.replaceFirstMapped(
      expression,
      (match) => (match.group(1) ?? '') + value.trim() + ';',
    );
  }

  Future<void> _saveContent() async {
    final root = _root;
    if (root == null) return;
    final file = File(p.join(root.path, 'index.html'));
    var html = await file.readAsString();

    html = html.replaceFirstMapped(
      RegExp(r'<title>[\s\S]*?</title>', caseSensitive: false),
      (_) => '<title>' + _escapeHtml(_pageTitleController.text.trim()) + '</title>',
    );

    html = html.replaceFirstMapped(
      RegExp(
        r'<p\s+class="kicker">[\s\S]*?</p>',
        caseSensitive: false,
      ),
      (_) => '<p class="kicker">' +
          _escapeHtml(_kickerController.text.trim()) +
          '</p>',
    );

    final title = _heroTitleController.text
        .split('\n')
        .map((line) => _escapeHtml(line.trim()))
        .join('<br>');
    html = html.replaceFirstMapped(
      RegExp(r'<h1>[\s\S]*?</h1>', caseSensitive: false),
      (_) => '<h1>' + title + '</h1>',
    );

    html = html.replaceFirstMapped(
      RegExp(
        r'<p\s+class="hero-text">[\s\S]*?</p>',
        caseSensitive: false,
      ),
      (_) => '<p class="hero-text">\n          ' +
          _escapeHtml(_heroTextController.text.trim()) +
          '\n        </p>',
    );

    await file.writeAsString(html);
    if (_selectedPath != null && p.equals(_selectedPath!, file.path)) {
      await _openFile(file.path);
    }
    _showMessage('Inhalt gespeichert.');
    await _reloadPreview();
  }

  Future<void> _saveDesign() async {
    final root = _root;
    if (root == null) return;
    final file = File(p.join(root.path, 'css', 'style.css'));
    var css = await file.readAsString();

    css = _setCssVariable(css, 'paper', _paperController.text);
    css = _setCssVariable(css, 'ink', _inkController.text);
    css = _setCssVariable(css, 'dark', _darkController.text);
    css = _setCssVariable(css, 'max', _maxController.text);
    css = _setCssVariable(css, 'pad', _padController.text);

    await file.writeAsString(css);
    if (_selectedPath != null && p.equals(_selectedPath!, file.path)) {
      await _openFile(file.path);
    }
    _showMessage('Design gespeichert.');
    await _reloadPreview();
  }

  Future<void> _initializePreview() async {
    final root = _root;
    if (root == null || _previewController != null) return;
    if (!Platform.isWindows) {
      setState(() {
        _previewError = UnsupportedError(
          'Die eingebettete Vorschau ist in dieser Version für Windows vorgesehen.',
        );
      });
      return;
    }

    try {
      final version = await WebviewController.getWebViewVersion();
      if (version == null) {
        throw StateError('Microsoft WebView2 Runtime wurde nicht gefunden.');
      }
      final controller = WebviewController();
      await controller.initialize();
      await controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.sameWindow);
      await controller.setDefaultContextMenusEnabled(true);
      _previewController = controller;
      await controller.loadUrl(
        Uri.file(p.join(root.path, 'index.html')).toString(),
      );
      if (!mounted) return;
      setState(() {
        _previewReady = true;
        _previewError = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _previewError = error;
        _previewReady = false;
      });
    }
  }

  Future<void> _reloadPreview() async {
    final controller = _previewController;
    if (controller == null || !_previewReady) return;
    try {
      await controller.reload();
    } catch (_) {
      final root = _root;
      if (root != null) {
        await controller.loadUrl(
          Uri.file(p.join(root.path, 'index.html')).toString(),
        );
      }
    }
  }

  Future<void> _openExternalPreview() async {
    final root = _root;
    if (root == null) return;
    final index = p.join(root.path, 'index.html');
    if (Platform.isWindows) {
      await Process.start('explorer.exe', [index]);
      return;
    }
    if (Platform.isMacOS) {
      await Process.start('open', [index]);
      return;
    }
    if (Platform.isLinux) {
      await Process.start('xdg-open', [index]);
    }
  }

  Future<void> _openRepoFolder() async {
    final root = _root;
    if (root == null) return;
    if (Platform.isWindows) {
      await Process.start('explorer.exe', [root.path]);
      return;
    }
    if (Platform.isMacOS) {
      await Process.start('open', [root.path]);
      return;
    }
    if (Platform.isLinux) {
      await Process.start('xdg-open', [root.path]);
    }
  }

  String _relative(String path) {
    final root = _root;
    return root == null ? path : p.relative(path, from: root.path);
  }

  void _showMessage(String message) {
    if (!mounted) return;
    setState(() => _status = message);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  double get _previewWidth => switch (_device) {
        PreviewDevice.desktop => 1440,
        PreviewDevice.tablet => 820,
        PreviewDevice.mobile => 390,
      };

  Future<void> _saveCurrentSurface() async {
    if (_dirty) {
      await _saveCode();
    }
  }

  @override
  Widget build(BuildContext context) {
    return CallbackShortcuts(
      bindings: <ShortcutActivator, VoidCallback>{
        const SingleActivator(LogicalKeyboardKey.keyS, control: true): () {
          _saveCurrentSurface();
        },
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          appBar: AppBar(
            titleSpacing: 18,
            title: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('CIRCUITCURIOS WEBSITE STUDIO'),
                Text(
                  'HTML / CSS / JS bleiben die Source of Truth',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w400),
                ),
              ],
            ),
            actions: [
              IconButton(
                tooltip: 'Website-Repo wählen',
                onPressed: _chooseRoot,
                icon: const Icon(Icons.folder_open_outlined),
              ),
              IconButton(
                tooltip: 'Repo im Explorer öffnen',
                onPressed: _root == null ? null : _openRepoFolder,
                icon: const Icon(Icons.folder_outlined),
              ),
              IconButton(
                tooltip: 'Extern öffnen',
                onPressed: _root == null ? null : _openExternalPreview,
                icon: const Icon(Icons.open_in_new),
              ),
              IconButton(
                tooltip: 'Vorschau neu laden',
                onPressed: _previewReady ? _reloadPreview : null,
                icon: const Icon(Icons.refresh),
              ),
              const SizedBox(width: 8),
            ],
          ),
          body: _busy
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    Expanded(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildFilesPane(),
                          const VerticalDivider(width: 1),
                          Expanded(child: _buildPreviewPane()),
                          const VerticalDivider(width: 1),
                          _buildPropertiesPane(),
                        ],
                      ),
                    ),
                    Container(
                      height: 28,
                      alignment: Alignment.centerLeft,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      color: Theme.of(context).colorScheme.surfaceContainerLow,
                      child: Text(
                        _status,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildFilesPane() {
    final theme = Theme.of(context);
    return SizedBox(
      width: 235,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: Text(
              'DATEIEN',
              style: theme.textTheme.labelLarge?.copyWith(letterSpacing: 1.2),
            ),
          ),
          if (_root == null)
            Padding(
              padding: const EdgeInsets.all(14),
              child: FilledButton.icon(
                onPressed: _chooseRoot,
                icon: const Icon(Icons.folder_open),
                label: const Text('REPO WÄHLEN'),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _files.length,
                itemBuilder: (context, index) {
                  final file = _files[index];
                  final relative = _relative(file.path);
                  final selected =
                      _selectedPath != null && p.equals(_selectedPath!, file.path);
                  return ListTile(
                    dense: true,
                    selected: selected,
                    leading: Icon(_iconForPath(relative), size: 18),
                    title: Text(
                      relative,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                    onTap: () async {
                      if (_dirty) {
                        final discard = await _confirmDiscard();
                        if (!discard) return;
                      }
                      await _openFile(file.path);
                    },
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  IconData _iconForPath(String path) {
    return switch (p.extension(path).toLowerCase()) {
      '.html' => Icons.language_outlined,
      '.css' => Icons.palette_outlined,
      '.js' => Icons.code_outlined,
      '.svg' => Icons.shape_line_outlined,
      _ => Icons.description_outlined,
    };
  }

  Future<bool> _confirmDiscard() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ungespeicherte Änderungen'),
        content: const Text(
          'Die aktuelle Datei enthält ungespeicherte Änderungen.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ABBRECHEN'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('VERWERFEN'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  Widget _buildPreviewPane() {
    final theme = Theme.of(context);
    return Container(
      color: const Color(0xFF090A0B),
      child: Column(
        children: [
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            color: theme.colorScheme.surfaceContainerLow,
            child: Row(
              children: [
                Text(
                  'LIVE PREVIEW',
                  style: theme.textTheme.labelLarge?.copyWith(letterSpacing: 1.1),
                ),
                const Spacer(),
                _DeviceButton(
                  label: 'Desktop',
                  icon: Icons.desktop_windows_outlined,
                  selected: _device == PreviewDevice.desktop,
                  onPressed: () =>
                      setState(() => _device = PreviewDevice.desktop),
                ),
                _DeviceButton(
                  label: 'Tablet',
                  icon: Icons.tablet_outlined,
                  selected: _device == PreviewDevice.tablet,
                  onPressed: () =>
                      setState(() => _device = PreviewDevice.tablet),
                ),
                _DeviceButton(
                  label: 'Mobile',
                  icon: Icons.phone_android_outlined,
                  selected: _device == PreviewDevice.mobile,
                  onPressed: () =>
                      setState(() => _device = PreviewDevice.mobile),
                ),
              ],
            ),
          ),
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: _previewWidth),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: Border.all(color: theme.colorScheme.outlineVariant),
                      boxShadow: const [
                        BoxShadow(
                          blurRadius: 28,
                          spreadRadius: 2,
                          color: Color(0x66000000),
                        ),
                      ],
                    ),
                    child: _previewBody(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _previewBody() {
    if (_root == null) {
      return const Center(child: Text('Website-Repo auswählen.'));
    }
    if (_previewError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Vorschau nicht verfügbar:\n' + _previewError.toString(),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }
    if (!_previewReady || _previewController == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return Webview(
      _previewController!,
      permissionRequested: (url, kind, isUserInitiated) async =>
          WebviewPermissionDecision.deny,
    );
  }

  Widget _buildPropertiesPane() {
    final theme = Theme.of(context);
    return SizedBox(
      width: 430,
      child: DefaultTabController(
        length: 3,
        child: Column(
          children: [
            Material(
              color: theme.colorScheme.surfaceContainerLow,
              child: const TabBar(
                tabs: [
                  Tab(text: 'INHALT'),
                  Tab(text: 'DESIGN'),
                  Tab(text: 'CODE'),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildContentEditor(),
                  _buildDesignEditor(),
                  _buildCodeEditor(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContentEditor() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Hero / Startseite'),
        const SizedBox(height: 12),
        TextField(
          controller: _pageTitleController,
          decoration: const InputDecoration(labelText: 'Browser-Titel'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _kickerController,
          decoration: const InputDecoration(labelText: 'Kicker'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _heroTitleController,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Hero-Überschrift',
            helperText: 'Zeilenumbruch entspricht <br>.',
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _heroTextController,
          minLines: 3,
          maxLines: 6,
          decoration: const InputDecoration(labelText: 'Hero-Text'),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _root == null ? null : _saveContent,
          icon: const Icon(Icons.save_outlined),
          label: const Text('INHALT SPEICHERN'),
        ),
        const SizedBox(height: 10),
        Text(
          'Diese Felder bearbeiten direkt die vorhandenen HTML-Elemente. '
          'Weitere Seiten und Blöcke bleiben vollständig im Code-Tab erreichbar.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _buildDesignEditor() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Globale CSS-Variablen'),
        const SizedBox(height: 12),
        TextField(
          controller: _paperController,
          decoration: const InputDecoration(labelText: '--paper'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _inkController,
          decoration: const InputDecoration(labelText: '--ink'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _darkController,
          decoration: const InputDecoration(labelText: '--dark'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _maxController,
          decoration: const InputDecoration(labelText: '--max'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _padController,
          decoration: const InputDecoration(labelText: '--pad'),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _root == null ? null : _saveDesign,
          icon: const Icon(Icons.palette_outlined),
          label: const Text('DESIGN SPEICHERN'),
        ),
      ],
    );
  }

  Widget _buildCodeEditor() {
    final selected = _selectedPath;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  selected == null ? 'Keine Datei gewählt' : _relative(selected),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
              if (_dirty)
                const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: Text('UNGESPEICHERT'),
                ),
              FilledButton.icon(
                onPressed: selected == null ? null : _saveCode,
                icon: const Icon(Icons.save_outlined, size: 18),
                label: const Text('SPEICHERN'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Expanded(
            child: TextField(
              controller: _codeController,
              onChanged: (_) {
                if (!_dirty) setState(() => _dirty = true);
              },
              expands: true,
              minLines: null,
              maxLines: null,
              textAlignVertical: TextAlignVertical.top,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 13,
                height: 1.35,
              ),
              decoration: const InputDecoration(
                alignLabelWithHint: true,
                contentPadding: EdgeInsets.all(12),
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Strg+S speichert die aktuelle Code-Datei.',
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String value) {
    return Text(
      value,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            letterSpacing: .4,
          ),
    );
  }
}

class _DeviceButton extends StatelessWidget {
  const _DeviceButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 5),
      child: IconButton(
        tooltip: label,
        onPressed: onPressed,
        style: IconButton.styleFrom(
          backgroundColor: selected
              ? Theme.of(context).colorScheme.secondaryContainer
              : Colors.transparent,
        ),
        icon: Icon(icon, size: 19),
      ),
    );
  }
}
