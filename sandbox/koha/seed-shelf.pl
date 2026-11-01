use Modern::Perl;
use C4::Biblio qw(AddBiblio);
use MARC::Record;
use MARC::Field;
use Koha::Item;
use Koha::Items;
use Koha::ItemType;
use Koha::ItemTypes;
use JSON qw(encode_json);
my $type = Koha::ItemTypes->find('BK');
$type ||= Koha::ItemType->new({itemtype=>'BK',description=>'Shelf demo print books',notforloan=>0})->store;
my $existing = Koha::Items->find({barcode=>'SHELF-DEMO-RUST-001'});
my ($biblio, $biblioitem);
if ($existing) {
    $biblio = $existing->biblionumber;
    $biblioitem = $existing->biblioitemnumber;
} else {
    my $record = MARC::Record->new;
    $record->leader('00000nam a2200000 a 4500');
    $record->append_fields(
        MARC::Field->new('100','1',' ',a=>'Le Guin, Ursula K.'),
        MARC::Field->new('245','1','4',a=>'The Left Hand of Darkness'),
        MARC::Field->new('260',' ',' ',c=>'1969'),
        MARC::Field->new('500',' ',' ',a=>'Shelf integration sandbox: bibliographic metadata for a real title; all attached items and branch holdings are synthetic.'),
        MARC::Field->new('650',' ','0',a=>'Science fiction'),
        MARC::Field->new('942',' ',' ',c=>'BK'),
    );
    ($biblio,$biblioitem) = AddBiblio($record,'');
    Koha::Item->new({biblionumber=>$biblio,biblioitemnumber=>$biblioitem,homebranch=>'RUST',holdingbranch=>'RUST',barcode=>'SHELF-DEMO-RUST-001',itype=>'BK',notforloan=>0})->store;
    Koha::Item->new({biblionumber=>$biblio,biblioitemnumber=>$biblioitem,homebranch=>'ASH',holdingbranch=>'ASH',barcode=>'SHELF-DEMO-ASH-001',itype=>'BK',notforloan=>1})->store;
}
print encode_json({KOHA_SMOKE_TITLE=>'The Left Hand of Darkness', KOHA_SMOKE_EXPECT_ID=>"$biblio", KOHA_FORMAT_MAP=>encode_json({BK=>'print'})});
