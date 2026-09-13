using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;

namespace JobStore.Infrastructure.Services;

/// <summary>
/// Extraction du texte brut des CV que l'API Claude ne lit pas nativement.
///
/// Les PDF ne passent PAS par ici: ils sont envoyes tels quels a Claude, qui lit
/// la mise en page, les colonnes et les tableaux mieux qu'une extraction de texte.
///  - .txt  : lecture directe
///  - .docx : decompression ZIP puis texte de word/document.xml
///  - .doc  : ancien format binaire, recuperation des chaines lisibles (best effort)
/// </summary>
internal static partial class ResumeTextExtractor
{
    public static string Extract(string extension, byte[] content) => extension switch
    {
        ".txt" => DecodeText(content),
        ".docx" => ExtractFromDocx(content),
        ".doc" => ExtractPrintable(content),
        _ => string.Empty
    };

    /// <summary>UTF-8 par defaut; bascule en Latin-1 si le fichier n'est manifestement pas en UTF-8.</summary>
    private static string DecodeText(byte[] content)
    {
        var utf8 = Encoding.UTF8.GetString(content);
        return utf8.Contains('�') ? Encoding.Latin1.GetString(content) : utf8;
    }

    private static string ExtractFromDocx(byte[] content)
    {
        using var stream = new MemoryStream(content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

        var entry = archive.GetEntry("word/document.xml");
        if (entry is null)
        {
            return string.Empty;
        }

        using var reader = new StreamReader(entry.Open(), Encoding.UTF8);
        var xml = reader.ReadToEnd();

        xml = ParagraphRegex().Replace(xml, "\n");
        xml = TabRegex().Replace(xml, "\t");
        var text = XmlTagRegex().Replace(xml, string.Empty);

        return System.Net.WebUtility.HtmlDecode(text);
    }

    /// <summary>Recupere les sequences de caracteres imprimables d'un binaire .doc.</summary>
    private static string ExtractPrintable(byte[] content)
    {
        var raw = Encoding.Latin1.GetString(content);
        var builder = new StringBuilder();

        foreach (Match match in PrintableRunRegex().Matches(raw))
        {
            builder.AppendLine(match.Value.Trim());
        }

        return builder.ToString();
    }

    [GeneratedRegex(@"</w:p>")]
    private static partial Regex ParagraphRegex();

    [GeneratedRegex(@"<w:tab[^>]*/>")]
    private static partial Regex TabRegex();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex XmlTagRegex();

    [GeneratedRegex(@"[\p{L}\p{N}\p{P}\p{Zs}@+]{4,}")]
    private static partial Regex PrintableRunRegex();
}
