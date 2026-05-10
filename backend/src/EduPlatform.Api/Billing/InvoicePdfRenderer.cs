using EduPlatform.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace EduPlatform.Api.Billing;

/// <summary>
/// Renderer faktury VAT do PDF z użyciem QuestPDF. Layout dopasowany do polskich faktur:
/// nagłówek + sprzedawca/nabywca + tabela pozycji + sumy + nota.
/// </summary>
public static class InvoicePdfRenderer
{
    static InvoicePdfRenderer()
    {
        // Community license — free dla < 1M USD revenue.
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Render(Invoice invoice, string sellerName = "Kursy.pl Sp. z o.o.", string? sellerNip = null, string? sellerAddress = null)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(40);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(t => t.FontSize(10));

                page.Header().Row(r =>
                {
                    r.RelativeItem().Column(col =>
                    {
                        col.Item().Text($"Faktura {invoice.Number}").Bold().FontSize(16);
                        col.Item().Text($"Data wystawienia: {invoice.IssuedAt:dd.MM.yyyy}").FontSize(9);
                        if (invoice.PaidAt is { } paid)
                            col.Item().Text($"Data płatności: {paid:dd.MM.yyyy}").FontSize(9);
                    });
                    r.ConstantItem(120).AlignRight().Column(col =>
                    {
                        col.Item().Text(sellerName).Bold();
                        col.Item().Text("polska platforma do nauki kodowania").FontSize(8).FontColor(Colors.Grey.Medium);
                    });
                });

                page.Content().PaddingVertical(20).Column(col =>
                {
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("SPRZEDAWCA").FontSize(8).FontColor(Colors.Grey.Medium);
                            c.Item().PaddingTop(4).Text(sellerName).Bold();
                            if (!string.IsNullOrEmpty(sellerAddress)) c.Item().Text(sellerAddress);
                            if (!string.IsNullOrEmpty(sellerNip)) c.Item().Text($"NIP: {sellerNip}");
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("NABYWCA").FontSize(8).FontColor(Colors.Grey.Medium);
                            c.Item().PaddingTop(4).Text(invoice.BuyerName).Bold();
                            if (!string.IsNullOrEmpty(invoice.BuyerAddressLine)) c.Item().Text(invoice.BuyerAddressLine);
                            if (!string.IsNullOrEmpty(invoice.BuyerPostalCode) || !string.IsNullOrEmpty(invoice.BuyerCity))
                                c.Item().Text($"{invoice.BuyerPostalCode} {invoice.BuyerCity}");
                            if (!string.IsNullOrEmpty(invoice.BuyerNip)) c.Item().Text($"NIP: {invoice.BuyerNip}");
                        });
                    });

                    col.Item().PaddingTop(20).Table(t =>
                    {
                        t.ColumnsDefinition(d =>
                        {
                            d.RelativeColumn(4);
                            d.RelativeColumn(2);
                            d.RelativeColumn(1);
                            d.RelativeColumn(2);
                            d.RelativeColumn(2);
                        });

                        t.Header(h =>
                        {
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text("Pozycja").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Netto").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("VAT").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("VAT kw.").Bold();
                            h.Cell().Background(Colors.Grey.Lighten3).Padding(4).AlignRight().Text("Brutto").Bold();
                        });

                        t.Cell().BorderBottom(0.5f).Padding(4).Text(invoice.Description);
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignRight().Text($"{invoice.NetAmount:F2} {invoice.Currency}");
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignRight().Text($"{invoice.VatRatePct}%");
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignRight().Text($"{invoice.VatAmount:F2} {invoice.Currency}");
                        t.Cell().BorderBottom(0.5f).Padding(4).AlignRight().Text($"{invoice.GrossAmount:F2} {invoice.Currency}");

                        // Sumy
                        t.Cell().ColumnSpan(4).Padding(4).AlignRight().Text("Razem do zapłaty:").Bold();
                        t.Cell().Padding(4).AlignRight().Text($"{invoice.GrossAmount:F2} {invoice.Currency}").Bold();
                    });

                    col.Item().PaddingTop(20).Text(
                            "Faktura została opłacona — nie wymaga uregulowania. Płatność obsługiwana przez Stripe.")
                        .FontSize(9).FontColor(Colors.Grey.Medium);
                });

                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span($"Kursy.pl · {invoice.Number} · ").FontSize(8).FontColor(Colors.Grey.Medium);
                    t.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Medium);
                    t.Span(" / ").FontSize(8).FontColor(Colors.Grey.Medium);
                    t.TotalPages().FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();
    }
}
